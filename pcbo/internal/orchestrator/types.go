package orchestrator

import (
	"errors"
	"fmt"
	"sort"
	"time"
)

// BackfillRequest captures the payload submitted by clients before normalization.
type BackfillRequest struct {
	RunID             string         `json:"runId"`
	Dataset           string         `json:"dataset"`
	Start             string         `json:"start"`
	End               string         `json:"end"`
	ChunkSeconds      int            `json:"chunkSeconds"`
	Policies          PolicyConfig   `json:"policies"`
	SourceRecords     []RecordInput  `json:"sourceRecords"`
	ExistingTargetIDs []string       `json:"existingTargetIds"`
	Metadata          map[string]any `json:"metadata,omitempty"`
}

// PolicyConfig holds the consent, jurisdiction, and retention constraints.
type PolicyConfig struct {
	RequireConsent       bool     `json:"requireConsent"`
	AllowedJurisdictions []string `json:"allowedJurisdictions"`
	RetentionCutoff      string   `json:"retentionCutoff"`
}

// RecordInput models the raw JSON representation of a record to be backfilled.
type RecordInput struct {
	ID                 string `json:"id"`
	OccurredAt         string `json:"occurredAt"`
	Jurisdiction       string `json:"jurisdiction"`
	ConsentGranted     bool   `json:"consentGranted"`
	RetentionExpiresAt string `json:"retentionExpiresAt"`
}

// NormalizedRequest is a fully parsed representation of a BackfillRequest.
type NormalizedRequest struct {
	RunID             string
	Dataset           string
	Start             time.Time
	End               time.Time
	ChunkSize         time.Duration
	Policies          NormalizedPolicy
	SourceRecords     []Record
	ExistingTargetIDs map[string]struct{}
	Metadata          map[string]any
}

// NormalizedPolicy contains typed policy data.
type NormalizedPolicy struct {
	RequireConsent       bool
	AllowedJurisdictions map[string]struct{}
	RetentionCutoff      time.Time
}

// Record represents a typed source record.
type Record struct {
	ID                 string
	OccurredAt         time.Time
	Jurisdiction       string
	ConsentGranted     bool
	RetentionExpiresAt time.Time
}

// Partition denotes a planned chunk of work.
type Partition struct {
	Index     int       `json:"index"`
	RangeFrom time.Time `json:"rangeFrom"`
	RangeTo   time.Time `json:"rangeTo"`
}

// PolicyViolation describes a single record failing a policy gate.
type PolicyViolation struct {
	Policy   string `json:"policy"`
	RecordID string `json:"recordId"`
	Reason   string `json:"reason"`
}

// DryRunChunk captures the diff for a partition during dry run.
type DryRunChunk struct {
	Partition        Partition         `json:"partition"`
	Status           string            `json:"status"`
	Adds             []string          `json:"adds"`
	Duplicates       []string          `json:"duplicates"`
	PolicyViolations []PolicyViolation `json:"policyViolations"`
}

// DryRunResult summarises the dry run evaluation.
type DryRunResult struct {
	RunID    string         `json:"runId"`
	Dataset  string         `json:"dataset"`
	Plan     []Partition    `json:"plan"`
	Chunks   []DryRunChunk  `json:"chunks"`
	Summary  DryRunSummary  `json:"summary"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

// DryRunSummary aggregates diff totals.
type DryRunSummary struct {
	TotalAdds       int `json:"totalAdds"`
	TotalDuplicates int `json:"totalDuplicates"`
	TotalBlocked    int `json:"totalBlocked"`
}

// PartitionProof captures deterministic evidence for a chunk.
type PartitionProof struct {
	Partition Partition `json:"partition"`
	Count     int       `json:"count"`
	Merkle    string    `json:"merkle"`
}

// PartitionReport captures the live execution status for a chunk.
type PartitionReport struct {
	Partition        Partition         `json:"partition"`
	Status           string            `json:"status"`
	AppliedRecords   int               `json:"appliedRecords"`
	Duplicates       []string          `json:"duplicates"`
	PolicyViolations []PolicyViolation `json:"policyViolations"`
	Proof            PartitionProof    `json:"proof"`
}

// ReportSummary aggregates live execution outcomes.
type ReportSummary struct {
	AppliedRecords    int `json:"appliedRecords"`
	DuplicateRecords  int `json:"duplicateRecords"`
	BlockedPartitions int `json:"blockedPartitions"`
}

// ReconciliationReport describes the run level view returned to callers.
type ReconciliationReport struct {
	RunID            string            `json:"runId"`
	Dataset          string            `json:"dataset"`
	GeneratedAt      time.Time         `json:"generatedAt"`
	Summary          ReportSummary     `json:"summary"`
	Partitions       []PartitionReport `json:"partitions"`
	PolicyViolations []PolicyViolation `json:"policyViolations"`
	Metadata         map[string]any    `json:"metadata,omitempty"`
}

// RollbackEntry documents the records that can be reverted for a chunk.
type RollbackEntry struct {
	Partition Partition `json:"partition"`
	RecordIDs []string  `json:"recordIds"`
}

// RollbackManifest consolidates rollback entries.
type RollbackManifest struct {
	RunID       string          `json:"runId"`
	GeneratedAt time.Time       `json:"generatedAt"`
	Entries     []RollbackEntry `json:"entries"`
	Metadata    map[string]any  `json:"metadata,omitempty"`
}

// ExecutionResult is returned after a live run.
type ExecutionResult struct {
	Plan     []Partition          `json:"plan"`
	Report   ReconciliationReport `json:"report"`
	Rollback RollbackManifest     `json:"rollback"`
}

// Validate ensures the request contains minimum required data.
func (r BackfillRequest) Validate() error {
	if r.RunID == "" {
		return errors.New("runId is required")
	}
	if r.Dataset == "" {
		return errors.New("dataset is required")
	}
	if r.Start == "" || r.End == "" {
		return errors.New("start and end timestamps are required")
	}
	if r.ChunkSeconds <= 0 {
		return errors.New("chunkSeconds must be greater than zero")
	}
	if r.Policies.RetentionCutoff == "" {
		return errors.New("policies.retentionCutoff is required")
	}
	return nil
}

// Normalize converts a BackfillRequest into a NormalizedRequest.
func (r BackfillRequest) Normalize() (NormalizedRequest, error) {
	if err := r.Validate(); err != nil {
		return NormalizedRequest{}, err
	}

	start, err := time.Parse(time.RFC3339, r.Start)
	if err != nil {
		return NormalizedRequest{}, fmt.Errorf("invalid start timestamp: %w", err)
	}
	end, err := time.Parse(time.RFC3339, r.End)
	if err != nil {
		return NormalizedRequest{}, fmt.Errorf("invalid end timestamp: %w", err)
	}
	if !end.After(start) {
		return NormalizedRequest{}, errors.New("end must be after start")
	}

	cutoff, err := time.Parse(time.RFC3339, r.Policies.RetentionCutoff)
	if err != nil {
		return NormalizedRequest{}, fmt.Errorf("invalid retentionCutoff: %w", err)
	}

	chunkSize := time.Duration(r.ChunkSeconds) * time.Second

	allowed := make(map[string]struct{}, len(r.Policies.AllowedJurisdictions))
	for _, j := range r.Policies.AllowedJurisdictions {
		allowed[j] = struct{}{}
	}

	normalizedRecords := make([]Record, 0, len(r.SourceRecords))
	for _, rec := range r.SourceRecords {
		if rec.ID == "" {
			return NormalizedRequest{}, errors.New("sourceRecords contain an entry without id")
		}
		occurredAt, err := time.Parse(time.RFC3339, rec.OccurredAt)
		if err != nil {
			return NormalizedRequest{}, fmt.Errorf("record %s has invalid occurredAt: %w", rec.ID, err)
		}
		retentionExpiry, err := time.Parse(time.RFC3339, rec.RetentionExpiresAt)
		if err != nil {
			return NormalizedRequest{}, fmt.Errorf("record %s has invalid retentionExpiresAt: %w", rec.ID, err)
		}
		normalizedRecords = append(normalizedRecords, Record{
			ID:                 rec.ID,
			OccurredAt:         occurredAt,
			Jurisdiction:       rec.Jurisdiction,
			ConsentGranted:     rec.ConsentGranted,
			RetentionExpiresAt: retentionExpiry,
		})
	}

	sort.SliceStable(normalizedRecords, func(i, j int) bool {
		if normalizedRecords[i].OccurredAt.Equal(normalizedRecords[j].OccurredAt) {
			return normalizedRecords[i].ID < normalizedRecords[j].ID
		}
		return normalizedRecords[i].OccurredAt.Before(normalizedRecords[j].OccurredAt)
	})

	existing := make(map[string]struct{}, len(r.ExistingTargetIDs))
	for _, id := range r.ExistingTargetIDs {
		existing[id] = struct{}{}
	}

	return NormalizedRequest{
		RunID:     r.RunID,
		Dataset:   r.Dataset,
		Start:     start,
		End:       end,
		ChunkSize: chunkSize,
		Policies: NormalizedPolicy{
			RequireConsent:       r.Policies.RequireConsent,
			AllowedJurisdictions: allowed,
			RetentionCutoff:      cutoff,
		},
		SourceRecords:     normalizedRecords,
		ExistingTargetIDs: existing,
		Metadata:          r.Metadata,
	}, nil
}
