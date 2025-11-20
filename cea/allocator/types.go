package allocator

import "time"

// Subject represents an individual whose consent and attributes drive allocation decisions.
type Subject struct {
	TenantID   string                  `json:"tenantId"`
	SubjectID  string                  `json:"subjectId"`
	Attributes map[string]string       `json:"attributes"`
	Consents   map[string]ConsentGrant `json:"consents"`
}

// ConsentGrant captures whether a subject has consented to a specific purpose.
type ConsentGrant struct {
	Granted   bool      `json:"granted"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ExperimentConfig describes how an experiment should allocate variants.
type ExperimentConfig struct {
	ID             string          `json:"id"`
	TenantID       string          `json:"tenantId"`
	Purpose        string          `json:"purpose"`
	Variants       []VariantConfig `json:"variants"`
	Strata         []StratumConfig `json:"strata"`
	Exclusions     []ExclusionRule `json:"exclusions"`
	StickinessKeys []string        `json:"stickinessKeys"`
	PowerTolerance float64         `json:"powerTolerance"`
}

// VariantConfig defines the weight for a specific variant arm.
type VariantConfig struct {
	Name   string  `json:"name"`
	Weight float64 `json:"weight"`
}

// StratumConfig allows configuring stratified assignment with custom weights and match criteria.
type StratumConfig struct {
	Name     string             `json:"name"`
	Criteria map[string]string  `json:"criteria"`
	Weights  map[string]float64 `json:"weights"`
}

// ExclusionRule filters subjects based on attribute values.
type ExclusionRule struct {
	Attribute string   `json:"attribute"`
	Values    []string `json:"values"`
}

// Assignment captures the outcome of an allocation.
type Assignment struct {
	ExperimentID string    `json:"experimentId"`
	SubjectID    string    `json:"subjectId"`
	TenantID     string    `json:"tenantId"`
	Variant      string    `json:"variant"`
	Stratum      string    `json:"stratum"`
	AssignedAt   time.Time `json:"assignedAt"`
	Reason       string    `json:"reason"`
}

// LedgerEntry represents an auditable change to subject assignment state.
type LedgerEntry struct {
	Timestamp    time.Time         `json:"timestamp"`
	Event        string            `json:"event"`
	ExperimentID string            `json:"experimentId"`
	SubjectID    string            `json:"subjectId"`
	TenantID     string            `json:"tenantId"`
	Variant      string            `json:"variant,omitempty"`
	Stratum      string            `json:"stratum,omitempty"`
	Reason       string            `json:"reason"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

// Ledger stores assignment changes for auditability.
type Ledger interface {
	Record(entry LedgerEntry)
	Entries() []LedgerEntry
}
