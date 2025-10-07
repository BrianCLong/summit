// Policy Drift Detection & Rollback Service - v1.0
// Detects policy deltas, alerts ≤5 min, one-click rollback with audit

package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
)

const (
	PolicyPrefix      = "policy:"
	PolicyHashPrefix  = "policy_hash:"
	PolicyBackupPrefix = "policy_backup:"
	DriftAlertTTL     = 5 * time.Minute
)

// PolicyDiff represents changes in policy
type PolicyDiff struct {
	PolicyID      string                 `json:"policy_id"`
	PreviousHash  string                 `json:"previous_hash"`
	CurrentHash   string                 `json:"current_hash"`
	Added         []string               `json:"added"`
	Removed       []string               `json:"removed"`
	Modified      []map[string]interface{} `json:"modified"`
	DetectedAt    time.Time              `json:"detected_at"`
	DriftType     string                 `json:"drift_type"` // "manual", "unauthorized", "corruption"
}

// PolicyBackup represents a policy snapshot
type PolicyBackup struct {
	BackupID     string    `json:"backup_id"`
	PolicyID     string    `json:"policy_id"`
	Content      string    `json:"content"`
	Hash         string    `json:"hash"`
	Author       string    `json:"author"`
	CreatedAt    time.Time `json:"created_at"`
	ApprovedBy   []string  `json:"approved_by"`
	ChangeReason string    `json:"change_reason"`
}

// RollbackRequest represents rollback operation
type RollbackRequest struct {
	RequestID    string    `json:"request_id"`
	PolicyID     string    `json:"policy_id"`
	TargetBackupID string  `json:"target_backup_id"`
	RequesterID  string    `json:"requester_id"`
	Reason       string    `json:"reason"`
	EmergencyKillSwitch bool `json:"emergency_kill_switch"`
	RequestedAt  time.Time `json:"requested_at"`
}

// RollbackResult represents rollback outcome
type RollbackResult struct {
	RequestID    string    `json:"request_id"`
	PolicyID     string    `json:"policy_id"`
	Success      bool      `json:"success"`
	RolledBackTo string    `json:"rolled_back_to"`
	PreviousHash string    `json:"previous_hash"`
	NewHash      string    `json:"new_hash"`
	AuditTrail   []AuditEvent `json:"audit_trail"`
	CompletedAt  time.Time `json:"completed_at"`
}

// AuditEvent represents single audit log entry
type AuditEvent struct {
	EventType   string    `json:"event_type"`
	PolicyID    string    `json:"policy_id"`
	UserID      string    `json:"user_id"`
	Action      string    `json:"action"`
	Details     map[string]interface{} `json:"details"`
	Timestamp   time.Time `json:"timestamp"`
}

// PolicyDriftDetector handles drift detection and rollback
type PolicyDriftDetector struct {
	redis          *redis.Client
	auditLogger    *AuditLogger
	alertThreshold time.Duration
}

// AuditLogger handles audit trail
type AuditLogger struct {
	redis *redis.Client
}

// NewPolicyDriftDetector creates drift detector instance
func NewPolicyDriftDetector(redisClient *redis.Client) *PolicyDriftDetector {
	return &PolicyDriftDetector{
		redis:          redisClient,
		auditLogger:    &AuditLogger{redis: redisClient},
		alertThreshold: DriftAlertTTL,
	}
}

// DetectDrift checks for policy changes and alerts
func (d *PolicyDriftDetector) DetectDrift(ctx context.Context, policyID string, currentContent string) (*PolicyDiff, error) {
	// Calculate current hash
	currentHash := d.calculateHash(currentContent)

	// Get stored hash
	hashKey := PolicyHashPrefix + policyID
	storedHash, err := d.redis.Get(ctx, hashKey).Result()

	if err == redis.Nil {
		// First time seeing this policy - store hash
		err = d.redis.Set(ctx, hashKey, currentHash, 0).Err()
		if err != nil {
			return nil, fmt.Errorf("failed to store initial hash: %w", err)
		}

		log.Printf("Policy %s initialized with hash %s", policyID, currentHash)
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to get stored hash: %w", err)
	}

	// Check for drift
	if storedHash != currentHash {
		// Drift detected!
		log.Printf("DRIFT DETECTED: Policy %s changed (hash: %s -> %s)", policyID, storedHash, currentHash)

		// Get previous content for diff
		backupKey := PolicyBackupPrefix + policyID + ":latest"
		previousContent, err := d.redis.Get(ctx, backupKey).Result()
		if err != nil && err != redis.Nil {
			return nil, fmt.Errorf("failed to get previous content: %w", err)
		}

		// Calculate diff
		diff := d.calculateDiff(policyID, previousContent, currentContent, storedHash, currentHash)

		// Emit drift alert
		err = d.emitDriftAlert(ctx, diff)
		if err != nil {
			log.Printf("Failed to emit drift alert: %v", err)
		}

		// Update hash
		err = d.redis.Set(ctx, hashKey, currentHash, 0).Err()
		if err != nil {
			return nil, fmt.Errorf("failed to update hash: %w", err)
		}

		// Audit log
		d.auditLogger.Log(ctx, AuditEvent{
			EventType: "policy_drift_detected",
			PolicyID:  policyID,
			Action:    "drift_detected",
			Details: map[string]interface{}{
				"previous_hash": storedHash,
				"current_hash":  currentHash,
				"drift_type":    diff.DriftType,
			},
			Timestamp: time.Now(),
		})

		return diff, nil
	}

	return nil, nil // No drift
}

// BackupPolicy creates policy backup snapshot
func (d *PolicyDriftDetector) BackupPolicy(ctx context.Context, backup PolicyBackup) error {
	// Calculate hash
	backup.Hash = d.calculateHash(backup.Content)
	backup.CreatedAt = time.Now()

	// Serialize backup
	backupJSON, err := json.Marshal(backup)
	if err != nil {
		return fmt.Errorf("failed to serialize backup: %w", err)
	}

	// Store backup with version
	backupKey := PolicyBackupPrefix + backup.PolicyID + ":" + backup.BackupID
	err = d.redis.Set(ctx, backupKey, backupJSON, 0).Err()
	if err != nil {
		return fmt.Errorf("failed to store backup: %w", err)
	}

	// Store as latest
	latestKey := PolicyBackupPrefix + backup.PolicyID + ":latest"
	err = d.redis.Set(ctx, latestKey, backup.Content, 0).Err()
	if err != nil {
		return fmt.Errorf("failed to store latest: %w", err)
	}

	// Update hash
	hashKey := PolicyHashPrefix + backup.PolicyID
	err = d.redis.Set(ctx, hashKey, backup.Hash, 0).Err()
	if err != nil {
		return fmt.Errorf("failed to update hash: %w", err)
	}

	// Audit log
	d.auditLogger.Log(ctx, AuditEvent{
		EventType: "policy_backup_created",
		PolicyID:  backup.PolicyID,
		UserID:    backup.Author,
		Action:    "backup_created",
		Details: map[string]interface{}{
			"backup_id":     backup.BackupID,
			"hash":          backup.Hash,
			"change_reason": backup.ChangeReason,
		},
		Timestamp: time.Now(),
	})

	log.Printf("Policy %s backed up: %s (hash: %s)", backup.PolicyID, backup.BackupID, backup.Hash)

	return nil
}

// RollbackPolicy performs one-click rollback
func (d *PolicyDriftDetector) RollbackPolicy(ctx context.Context, req RollbackRequest) (*RollbackResult, error) {
	req.RequestedAt = time.Now()

	// Get target backup
	backupKey := PolicyBackupPrefix + req.PolicyID + ":" + req.TargetBackupID
	backupJSON, err := d.redis.Get(ctx, backupKey).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("backup not found: %s", req.TargetBackupID)
	} else if err != nil {
		return nil, fmt.Errorf("failed to get backup: %w", err)
	}

	var backup PolicyBackup
	err = json.Unmarshal([]byte(backupJSON), &backup)
	if err != nil {
		return nil, fmt.Errorf("failed to parse backup: %w", err)
	}

	// Get current hash
	hashKey := PolicyHashPrefix + req.PolicyID
	previousHash, err := d.redis.Get(ctx, hashKey).Result()
	if err != nil && err != redis.Nil {
		return nil, fmt.Errorf("failed to get current hash: %w", err)
	}

	// Perform rollback (restore backup content)
	// NOTE: In production, this would apply the backup to actual policy store
	latestKey := PolicyBackupPrefix + req.PolicyID + ":latest"
	err = d.redis.Set(ctx, latestKey, backup.Content, 0).Err()
	if err != nil {
		return nil, fmt.Errorf("failed to restore content: %w", err)
	}

	// Update hash
	err = d.redis.Set(ctx, hashKey, backup.Hash, 0).Err()
	if err != nil {
		return nil, fmt.Errorf("failed to update hash: %w", err)
	}

	// Build audit trail
	auditTrail := []AuditEvent{
		{
			EventType: "policy_rollback_requested",
			PolicyID:  req.PolicyID,
			UserID:    req.RequesterID,
			Action:    "rollback_requested",
			Details: map[string]interface{}{
				"target_backup_id": req.TargetBackupID,
				"reason":           req.Reason,
				"kill_switch":      req.EmergencyKillSwitch,
			},
			Timestamp: req.RequestedAt,
		},
		{
			EventType: "policy_rollback_executed",
			PolicyID:  req.PolicyID,
			UserID:    "system",
			Action:    "rollback_executed",
			Details: map[string]interface{}{
				"previous_hash": previousHash,
				"new_hash":      backup.Hash,
				"backup_id":     req.TargetBackupID,
			},
			Timestamp: time.Now(),
		},
	}

	// Log all audit events
	for _, event := range auditTrail {
		d.auditLogger.Log(ctx, event)
	}

	result := &RollbackResult{
		RequestID:    req.RequestID,
		PolicyID:     req.PolicyID,
		Success:      true,
		RolledBackTo: req.TargetBackupID,
		PreviousHash: previousHash,
		NewHash:      backup.Hash,
		AuditTrail:   auditTrail,
		CompletedAt:  time.Now(),
	}

	log.Printf("Policy %s rolled back to %s (hash: %s -> %s)", req.PolicyID, req.TargetBackupID, previousHash, backup.Hash)

	return result, nil
}

// EmergencyKillSwitch immediately reverts to last known good
func (d *PolicyDriftDetector) EmergencyKillSwitch(ctx context.Context, policyID string, requesterID string) (*RollbackResult, error) {
	// Get latest backup
	latestKey := PolicyBackupPrefix + policyID + ":latest"
	_, err := d.redis.Get(ctx, latestKey).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("no backup found for policy %s", policyID)
	} else if err != nil {
		return nil, fmt.Errorf("failed to get latest backup: %w", err)
	}

	// Create emergency rollback request
	req := RollbackRequest{
		RequestID:           fmt.Sprintf("emergency_%d", time.Now().Unix()),
		PolicyID:            policyID,
		TargetBackupID:      "latest",
		RequesterID:         requesterID,
		Reason:              "EMERGENCY KILL SWITCH ACTIVATED",
		EmergencyKillSwitch: true,
		RequestedAt:         time.Now(),
	}

	return d.RollbackPolicy(ctx, req)
}

// Helper methods

func (d *PolicyDriftDetector) calculateHash(content string) string {
	hash := sha256.Sum256([]byte(content))
	return hex.EncodeToString(hash[:])
}

func (d *PolicyDriftDetector) calculateDiff(policyID, previousContent, currentContent, previousHash, currentHash string) *PolicyDiff {
	// Simple line-based diff (in production, use proper diff algorithm)
	diff := &PolicyDiff{
		PolicyID:     policyID,
		PreviousHash: previousHash,
		CurrentHash:  currentHash,
		DetectedAt:   time.Now(),
		DriftType:    "manual", // Default
		Added:        []string{},
		Removed:      []string{},
		Modified:     []map[string]interface{}{},
	}

	// Detect drift type
	if previousContent == "" {
		diff.DriftType = "new_policy"
	} else {
		// Simplified - in production, check authorization context
		diff.DriftType = "manual"
	}

	return diff
}

func (d *PolicyDriftDetector) emitDriftAlert(ctx context.Context, diff *PolicyDiff) error {
	alertKey := "drift_alert:" + diff.PolicyID + ":" + fmt.Sprintf("%d", diff.DetectedAt.Unix())

	alertJSON, err := json.Marshal(diff)
	if err != nil {
		return err
	}

	// Store alert with TTL (alerts should be processed within 5 min)
	err = d.redis.Set(ctx, alertKey, alertJSON, DriftAlertTTL).Err()
	if err != nil {
		return err
	}

	log.Printf("Drift alert emitted for policy %s (expires in %v)", diff.PolicyID, DriftAlertTTL)

	return nil
}

// AuditLogger methods

func (a *AuditLogger) Log(ctx context.Context, event AuditEvent) error {
	event.Timestamp = time.Now()

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to serialize audit event: %w", err)
	}

	// Store in Redis list (immutable append-only)
	auditKey := "audit:policy:" + event.PolicyID
	err = a.redis.RPush(ctx, auditKey, eventJSON).Err()
	if err != nil {
		return fmt.Errorf("failed to store audit event: %w", err)
	}

	log.Printf("Audit: %s - %s - %s", event.EventType, event.PolicyID, event.Action)

	return nil
}

func (a *AuditLogger) GetAuditTrail(ctx context.Context, policyID string) ([]AuditEvent, error) {
	auditKey := "audit:policy:" + policyID

	eventsJSON, err := a.redis.LRange(ctx, auditKey, 0, -1).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get audit trail: %w", err)
	}

	events := make([]AuditEvent, len(eventsJSON))
	for i, eventJSON := range eventsJSON {
		err = json.Unmarshal([]byte(eventJSON), &events[i])
		if err != nil {
			return nil, fmt.Errorf("failed to parse audit event: %w", err)
		}
	}

	return events, nil
}
