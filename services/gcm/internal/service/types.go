package service

import "time"

// WorkloadUsage captures normalized resource consumption metrics.
type WorkloadUsage struct {
	CPUHours  float64 `json:"cpuHours"`
	StorageGB float64 `json:"storageGb"`
	EgressGB  float64 `json:"egressGb"`
}

// RateCard defines per-unit prices for a policy tier.
type RateCard struct {
	CPUPerHour   float64 `yaml:"cpu_per_hour" json:"cpuPerHour"`
	StoragePerGB float64 `yaml:"storage_per_gb" json:"storagePerGb"`
	EgressPerGB  float64 `yaml:"egress_per_gb" json:"egressPerGb"`
}

// BudgetConfig configures spending guardrails for a policy tier.
type BudgetConfig struct {
	MonthlyLimit  float64            `yaml:"monthly_limit" json:"monthlyLimit"`
	Currency      string             `yaml:"currency" json:"currency"`
	AccountLimits map[string]float64 `yaml:"account_limits" json:"accountLimits"`
}

// PolicyConfig couples a policy tier/residency with its pricing and budget guardrails.
type PolicyConfig struct {
	PolicyTier string       `yaml:"policy_tier" json:"policyTier"`
	Residency  string       `yaml:"residency" json:"residency"`
	Rates      RateCard     `yaml:"rates" json:"rates"`
	Budget     BudgetConfig `yaml:"budget" json:"budget"`
}

// Config is the root configuration structure for the service.
type Config struct {
	Currency string         `yaml:"currency" json:"currency"`
	Policies []PolicyConfig `yaml:"policies" json:"policies"`
}

// JobRequest represents a meterable workload execution submitted by a client.
type JobRequest struct {
	JobID      string         `json:"jobId"`
	AccountID  string         `json:"accountId"`
	PolicyTier string         `json:"policyTier"`
	Residency  string         `json:"residency"`
	Usage      WorkloadUsage  `json:"usage"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

// ChargeBreakdown captures the monetary totals for a workload.
type ChargeBreakdown struct {
	Components map[string]float64 `json:"components"`
	Total      float64            `json:"total"`
	Currency   string             `json:"currency"`
}

// JobChargeResponse is returned when a job is successfully metered.
type JobChargeResponse struct {
	JobID      string          `json:"jobId"`
	AccountID  string          `json:"accountId"`
	PolicyTier string          `json:"policyTier"`
	Residency  string          `json:"residency"`
	Usage      WorkloadUsage   `json:"usage"`
	Charges    ChargeBreakdown `json:"charges"`
	ManifestID string          `json:"manifestId"`
	RecordedAt time.Time       `json:"recordedAt"`
}

// GuardrailViolation describes why a job was rejected.
type GuardrailViolation struct {
	AccountID        string   `json:"accountId"`
	PolicyTier       string   `json:"policyTier"`
	Residency        string   `json:"residency"`
	BudgetLimit      float64  `json:"budgetLimit"`
	BudgetConsumed   float64  `json:"budgetConsumed"`
	AttemptedCost    float64  `json:"attemptedCost"`
	Currency         string   `json:"currency"`
	RequiredHeadroom float64  `json:"requiredHeadroom"`
	ExplainPath      []string `json:"explainPath"`
}

// JobErrorResponse communicates that a job was blocked by guardrails.
type JobErrorResponse struct {
	Allowed   bool               `json:"allowed"`
	Reason    string             `json:"reason"`
	Violation GuardrailViolation `json:"violation"`
}

// ManifestLineItem is a per-policy entry in the billing manifest.
type ManifestLineItem struct {
	PolicyTier string          `json:"policyTier"`
	Residency  string          `json:"residency"`
	Usage      WorkloadUsage   `json:"usage"`
	Charges    ChargeBreakdown `json:"charges"`
}

// Manifest captures the signed billing state for an account.
type Manifest struct {
	ManifestID  string             `json:"manifestId"`
	AccountID   string             `json:"accountId"`
	Currency    string             `json:"currency"`
	GeneratedAt time.Time          `json:"generatedAt"`
	LineItems   []ManifestLineItem `json:"lineItems"`
	Total       ChargeBreakdown    `json:"total"`
	Signature   string             `json:"signature"`
}

// ProviderUsageReport represents aggregated metrics received from the cloud provider.
type ProviderUsageReport struct {
	AccountID  string        `json:"accountId"`
	PolicyTier string        `json:"policyTier"`
	Residency  string        `json:"residency"`
	Usage      WorkloadUsage `json:"usage"`
	TotalCost  float64       `json:"totalCost"`
	Currency   string        `json:"currency"`
	ReportedAt time.Time     `json:"reportedAt"`
}

// ReconciliationDelta captures variance between internal and provider numbers.
type ReconciliationDelta struct {
	PolicyTier      string              `json:"policyTier"`
	Residency       string              `json:"residency"`
	Internal        ManifestLineItem    `json:"internal"`
	Provider        ProviderUsageReport `json:"provider"`
	CostDelta       float64             `json:"costDelta"`
	WithinTolerance bool                `json:"withinTolerance"`
}

// ReconciliationSummary summarises the reconciliation status for an account.
type ReconciliationSummary struct {
	AccountID       string                `json:"accountId"`
	Currency        string                `json:"currency"`
	Tolerance       float64               `json:"tolerance"`
	Deltas          []ReconciliationDelta `json:"deltas"`
	TotalDelta      float64               `json:"totalDelta"`
	WithinTolerance bool                  `json:"withinTolerance"`
	GeneratedAt     time.Time             `json:"generatedAt"`
}

// PolicyKey is a composite identifier.
type PolicyKey struct {
	PolicyTier string
	Residency  string
}

// BudgetKey is a composite identifier for guardrails.
type BudgetKey struct {
	AccountID  string
	PolicyTier string
	Residency  string
}

// ChargeRecord represents a stored metered job.
type ChargeRecord struct {
	JobChargeResponse
}

// ProviderAggregate is the stored provider usage for reconciliation.
type ProviderAggregate struct {
	ProviderUsageReport
}
