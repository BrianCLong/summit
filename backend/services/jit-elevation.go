// JIT Elevation Service - RBAC Phase 3
// Just-In-Time privilege elevation with time-boxed grants and auto-revocation

package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

const (
	// MaxElevationDuration is the maximum allowed elevation time
	MaxElevationDuration = 5 * time.Minute

	// DefaultElevationDuration is the default elevation time
	DefaultElevationDuration = 2 * time.Minute

	// ElevationPrefix is the Redis key prefix for elevation grants
	ElevationPrefix = "elevation:grant:"

	// PendingPrefix is the Redis key prefix for pending requests
	PendingPrefix = "elevation:pending:"
)

// ElevationRequest represents a request for privilege elevation
type ElevationRequest struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Tenant        string    `json:"tenant"`
	RequestedRole string    `json:"requested_role"`
	Justification string    `json:"justification"`
	Duration      int       `json:"duration_minutes"`
	CreatedAt     time.Time `json:"created_at"`
	Status        string    `json:"status"` // pending, approved, denied, expired
}

// ElevationGrant represents an approved elevation
type ElevationGrant struct {
	GrantID       string    `json:"grant_id"`
	UserID        string    `json:"user_id"`
	Tenant        string    `json:"tenant"`
	GrantedRole   string    `json:"granted_role"`
	GrantedAt     time.Time `json:"granted_at"`
	ExpiresAt     time.Time `json:"expires_at"`
	ApprovedBy    string    `json:"approved_by"`
	Justification string    `json:"justification"`
	Revoked       bool      `json:"revoked"`
	RevokedAt     *time.Time `json:"revoked_at,omitempty"`
	RevokedBy     string    `json:"revoked_by,omitempty"`
}

// JITElevationService handles privilege elevation
type JITElevationService struct {
	redis      *redis.Client
	auditLog   AuditLogger
	policyEval PolicyEvaluator
}

// NewJITElevationService creates a new elevation service
func NewJITElevationService(redis *redis.Client, audit AuditLogger, policy PolicyEvaluator) *JITElevationService {
	return &JITElevationService{
		redis:      redis,
		auditLog:   audit,
		policyEval: policy,
	}
}

// RequestElevation creates a new elevation request
func (s *JITElevationService) RequestElevation(ctx context.Context, req *ElevationRequest) (*ElevationRequest, error) {
	// Generate request ID
	req.ID = generateRequestID()
	req.CreatedAt = time.Now()
	req.Status = "pending"

	// Validate duration
	if req.Duration <= 0 {
		req.Duration = int(DefaultElevationDuration.Minutes())
	}
	if req.Duration > int(MaxElevationDuration.Minutes()) {
		return nil, fmt.Errorf("duration exceeds maximum allowed: %d minutes", int(MaxElevationDuration.Minutes()))
	}

	// Check if user already has active elevation
	activeGrant, err := s.GetActiveGrant(ctx, req.UserID, req.Tenant)
	if err != nil {
		return nil, fmt.Errorf("failed to check active grants: %w", err)
	}
	if activeGrant != nil {
		return nil, fmt.Errorf("user already has active elevation: %s", activeGrant.GrantID)
	}

	// Store pending request
	reqJSON, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	key := PendingPrefix + req.ID
	if err := s.redis.Set(ctx, key, reqJSON, 30*time.Minute).Err(); err != nil {
		return nil, fmt.Errorf("failed to store request: %w", err)
	}

	// Audit log
	s.auditLog.Log(ctx, AuditEvent{
		EventType: "jit_elevation_requested",
		UserID:    req.UserID,
		Tenant:    req.Tenant,
		Details: map[string]interface{}{
			"request_id":     req.ID,
			"requested_role": req.RequestedRole,
			"duration":       req.Duration,
			"justification":  req.Justification,
		},
		Timestamp: req.CreatedAt,
	})

	return req, nil
}

// ApproveElevation approves an elevation request and creates a grant
func (s *JITElevationService) ApproveElevation(ctx context.Context, requestID string, approverID string) (*ElevationGrant, error) {
	// Retrieve pending request
	reqKey := PendingPrefix + requestID
	reqJSON, err := s.redis.Get(ctx, reqKey).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("request not found: %s", requestID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve request: %w", err)
	}

	var req ElevationRequest
	if err := json.Unmarshal([]byte(reqJSON), &req); err != nil {
		return nil, fmt.Errorf("failed to unmarshal request: %w", err)
	}

	// Check if already processed
	if req.Status != "pending" {
		return nil, fmt.Errorf("request already processed: %s", req.Status)
	}

	// Evaluate policy for approval
	allowed, err := s.policyEval.EvaluateElevationApproval(ctx, &req, approverID)
	if err != nil {
		return nil, fmt.Errorf("policy evaluation failed: %w", err)
	}
	if !allowed {
		return nil, fmt.Errorf("policy denied elevation approval")
	}

	// Create grant
	grant := &ElevationGrant{
		GrantID:       generateGrantID(),
		UserID:        req.UserID,
		Tenant:        req.Tenant,
		GrantedRole:   req.RequestedRole,
		GrantedAt:     time.Now(),
		ExpiresAt:     time.Now().Add(time.Duration(req.Duration) * time.Minute),
		ApprovedBy:    approverID,
		Justification: req.Justification,
		Revoked:       false,
	}

	// Store grant with TTL
	grantJSON, err := json.Marshal(grant)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal grant: %w", err)
	}

	grantKey := ElevationPrefix + grant.UserID + ":" + grant.Tenant
	ttl := time.Until(grant.ExpiresAt)
	if err := s.redis.Set(ctx, grantKey, grantJSON, ttl).Err(); err != nil {
		return nil, fmt.Errorf("failed to store grant: %w", err)
	}

	// Update request status
	req.Status = "approved"
	reqJSON, _ = json.Marshal(req)
	s.redis.Set(ctx, reqKey, reqJSON, 24*time.Hour) // Keep for audit

	// Audit log
	s.auditLog.Log(ctx, AuditEvent{
		EventType: "jit_elevation_granted",
		UserID:    req.UserID,
		Tenant:    req.Tenant,
		Details: map[string]interface{}{
			"grant_id":    grant.GrantID,
			"granted_role": grant.GrantedRole,
			"expires_at":   grant.ExpiresAt,
			"approved_by":  approverID,
			"duration":     req.Duration,
		},
		Timestamp: grant.GrantedAt,
	})

	// Schedule auto-revocation
	go s.scheduleAutoRevocation(context.Background(), grant)

	return grant, nil
}

// DenyElevation denies an elevation request
func (s *JITElevationService) DenyElevation(ctx context.Context, requestID string, denierID string, reason string) error {
	reqKey := PendingPrefix + requestID
	reqJSON, err := s.redis.Get(ctx, reqKey).Result()
	if err == redis.Nil {
		return fmt.Errorf("request not found: %s", requestID)
	}
	if err != nil {
		return fmt.Errorf("failed to retrieve request: %w", err)
	}

	var req ElevationRequest
	if err := json.Unmarshal([]byte(reqJSON), &req); err != nil {
		return fmt.Errorf("failed to unmarshal request: %w", err)
	}

	if req.Status != "pending" {
		return fmt.Errorf("request already processed: %s", req.Status)
	}

	// Update status
	req.Status = "denied"
	reqJSON, _ = json.Marshal(req)
	s.redis.Set(ctx, reqKey, reqJSON, 24*time.Hour) // Keep for audit

	// Audit log
	s.auditLog.Log(ctx, AuditEvent{
		EventType: "jit_elevation_denied",
		UserID:    req.UserID,
		Tenant:    req.Tenant,
		Details: map[string]interface{}{
			"request_id": req.ID,
			"denied_by":  denierID,
			"reason":     reason,
		},
		Timestamp: time.Now(),
	})

	return nil
}

// RevokeElevation manually revokes an active grant
func (s *JITElevationService) RevokeElevation(ctx context.Context, userID string, tenant string, revokerID string, reason string) error {
	grant, err := s.GetActiveGrant(ctx, userID, tenant)
	if err != nil {
		return fmt.Errorf("failed to get active grant: %w", err)
	}
	if grant == nil {
		return fmt.Errorf("no active grant found for user")
	}

	// Mark as revoked
	now := time.Now()
	grant.Revoked = true
	grant.RevokedAt = &now
	grant.RevokedBy = revokerID

	// Delete from Redis (immediate revocation)
	grantKey := ElevationPrefix + userID + ":" + tenant
	if err := s.redis.Del(ctx, grantKey).Err(); err != nil {
		return fmt.Errorf("failed to delete grant: %w", err)
	}

	// Audit log
	s.auditLog.Log(ctx, AuditEvent{
		EventType: "jit_elevation_revoked",
		UserID:    userID,
		Tenant:    tenant,
		Details: map[string]interface{}{
			"grant_id":   grant.GrantID,
			"revoked_by": revokerID,
			"reason":     reason,
			"manual":     true,
		},
		Timestamp: now,
	})

	return nil
}

// GetActiveGrant retrieves the active elevation grant for a user
func (s *JITElevationService) GetActiveGrant(ctx context.Context, userID string, tenant string) (*ElevationGrant, error) {
	grantKey := ElevationPrefix + userID + ":" + tenant
	grantJSON, err := s.redis.Get(ctx, grantKey).Result()
	if err == redis.Nil {
		return nil, nil // No active grant
	}
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve grant: %w", err)
	}

	var grant ElevationGrant
	if err := json.Unmarshal([]byte(grantJSON), &grant); err != nil {
		return nil, fmt.Errorf("failed to unmarshal grant: %w", err)
	}

	// Check if expired
	if time.Now().After(grant.ExpiresAt) {
		s.redis.Del(ctx, grantKey) // Clean up expired grant
		return nil, nil
	}

	return &grant, nil
}

// CheckElevation verifies if a user has active elevation
func (s *JITElevationService) CheckElevation(ctx context.Context, userID string, tenant string, requiredRole string) (bool, *ElevationGrant, error) {
	grant, err := s.GetActiveGrant(ctx, userID, tenant)
	if err != nil {
		return false, nil, err
	}
	if grant == nil {
		return false, nil, nil
	}

	// Check if granted role matches required role
	if grant.GrantedRole == requiredRole {
		return true, grant, nil
	}

	return false, grant, nil
}

// scheduleAutoRevocation schedules automatic revocation at expiry
func (s *JITElevationService) scheduleAutoRevocation(ctx context.Context, grant *ElevationGrant) {
	// Wait until expiry
	time.Sleep(time.Until(grant.ExpiresAt))

	// Check if still active (might have been manually revoked)
	activeGrant, err := s.GetActiveGrant(ctx, grant.UserID, grant.Tenant)
	if err != nil || activeGrant == nil {
		return // Already revoked or error
	}

	// Auto-revoke
	grantKey := ElevationPrefix + grant.UserID + ":" + grant.Tenant
	s.redis.Del(ctx, grantKey)

	// Audit log
	s.auditLog.Log(ctx, AuditEvent{
		EventType: "jit_elevation_auto_revoked",
		UserID:    grant.UserID,
		Tenant:    grant.Tenant,
		Details: map[string]interface{}{
			"grant_id":   grant.GrantID,
			"expired_at": grant.ExpiresAt,
			"manual":     false,
		},
		Timestamp: time.Now(),
	})
}

// Helper functions
func generateRequestID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return "req_" + base64.URLEncoding.EncodeToString(b)
}

func generateGrantID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return "grant_" + base64.URLEncoding.EncodeToString(b)
}

// Interfaces (to be implemented by actual services)
type AuditLogger interface {
	Log(ctx context.Context, event AuditEvent) error
}

type PolicyEvaluator interface {
	EvaluateElevationApproval(ctx context.Context, req *ElevationRequest, approverID string) (bool, error)
}

type AuditEvent struct {
	EventType string
	UserID    string
	Tenant    string
	Details   map[string]interface{}
	Timestamp time.Time
}
