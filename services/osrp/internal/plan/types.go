package plan

import "time"

// PlannerConfig defines guardrail thresholds and signing configuration.
type PlannerConfig struct {
	ManifestVersion     string  `json:"manifestVersion"`
	BlockRateThreshold  float64 `json:"blockRateThreshold"`
	BlockRateConfidence float64 `json:"blockRateConfidence"`
	MinCanaryCatchRate  float64 `json:"minCanaryCatchRate"`
	CanaryConfidence    float64 `json:"canaryConfidence"`
	MaxLatencyP95       float64 `json:"maxLatencyP95"`
	MinBusinessKPI      float64 `json:"minBusinessKpi"`
	SigningKeyPath      string  `json:"signingKeyPath"`
}

// RolloutFixture captures stage observations used to plan a rollout.
type RolloutFixture struct {
	Release   string         `json:"release"`
	PlannedAt time.Time      `json:"plannedAt"`
	Stages    []FixtureStage `json:"stages"`
}

// FixtureStage contains observed metrics for one rollout stage.
type FixtureStage struct {
	Name           string         `json:"name"`
	TrafficPercent float64        `json:"trafficPercent"`
	Metrics        StageMetrics   `json:"metrics"`
	PolicyNotes    map[string]any `json:"policyNotes,omitempty"`
}

// StageMetrics holds the raw counts and aggregates needed by guardrails.
type StageMetrics struct {
	TotalRequests int     `json:"totalRequests"`
	Blocked       int     `json:"blocked"`
	CanaryCaught  int     `json:"canaryCaught"`
	CanaryMissed  int     `json:"canaryMissed"`
	LatencyP95MS  float64 `json:"latencyP95Ms"`
	BusinessKPI   float64 `json:"businessKpi"`
}

// PlanResult summarizes the planner output and any guardrail breaches.
type PlanResult struct {
	Manifest RolloutManifest
	Breaches []GuardrailBreach
}

// GuardrailBreach describes a single guardrail violation used for reports and auto-revert.
type GuardrailBreach struct {
	Stage       string
	Guardrail   string
	Category    string
	Actual      float64
	Threshold   float64
	Probability float64
	Message     string
}

// RolloutManifest is the signed manifest describing the rollout decision tree.
type RolloutManifest struct {
	Version     string            `json:"version"`
	Release     string            `json:"release"`
	PlannedAt   string            `json:"plannedAt"`
	GeneratedAt string            `json:"generatedAt"`
	Stages      []ManifestStage   `json:"stages"`
	Guardrails  []GuardrailResult `json:"guardrails"`
	AutoRevert  AutoRevertConfig  `json:"autoRevert"`
	Signature   string            `json:"signature"`
}

// ManifestStage is an entry per rollout step used by the dashboard and controllers.
type ManifestStage struct {
	Name           string            `json:"name"`
	TrafficPercent float64           `json:"trafficPercent"`
	Status         string            `json:"status"`
	Observations   StageObservations `json:"observations"`
}

// StageObservations stores derived metrics for transparency.
type StageObservations struct {
	BlockRate       float64 `json:"blockRate"`
	CanaryCatchRate float64 `json:"canaryCatchRate"`
	LatencyP95MS    float64 `json:"latencyP95Ms"`
	BusinessKPI     float64 `json:"businessKpi"`
}

// GuardrailResult exposes guardrail calculations for auditing and dashboards.
type GuardrailResult struct {
	Stage       string  `json:"stage"`
	Guardrail   string  `json:"guardrail"`
	Category    string  `json:"category"`
	Status      string  `json:"status"`
	Value       float64 `json:"value"`
	Threshold   float64 `json:"threshold"`
	Probability float64 `json:"probability,omitempty"`
}

// AutoRevertConfig expresses deterministic rollback instructions.
type AutoRevertConfig struct {
	Enabled bool   `json:"enabled"`
	Reason  string `json:"reason,omitempty"`
	Trigger string `json:"trigger,omitempty"`
}
