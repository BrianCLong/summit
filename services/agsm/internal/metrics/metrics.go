package metrics

import (
	"encoding/json"
	"time"
)

// ProbeResult captures the outcome of a single probe execution.
type ProbeResult struct {
	Name        string            `json:"name"`
	Scenario    string            `json:"scenario"`
	Success     bool              `json:"success"`
	Timestamp   time.Time         `json:"timestamp"`
	LatencyMs   int64             `json:"latencyMs"`
	Details     map[string]string `json:"details,omitempty"`
	Error       string            `json:"error,omitempty"`
	FailureMode string            `json:"failureMode,omitempty"`
	Canary      bool              `json:"canary"`
}

// Aggregates summarises probe success during the active window.
type Aggregates struct {
	Total       int     `json:"total"`
	Successes   int     `json:"successes"`
	Failures    int     `json:"failures"`
	SuccessRate float64 `json:"successRate"`
}

// Alert represents an SLO breach or probe level alert.
type Alert struct {
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Metric    string    `json:"metric,omitempty"`
	Threshold float64   `json:"threshold,omitempty"`
	Observed  float64   `json:"observed,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// State is the persisted snapshot consumed by the dashboard.
type State struct {
	LastUpdated   time.Time       `json:"lastUpdated"`
	WindowMinutes float64         `json:"windowMinutes"`
	SLO           json.RawMessage `json:"slo"`
	Aggregates    Aggregates      `json:"aggregates"`
	Probes        []ProbeResult   `json:"probes"`
	Alerts        []Alert         `json:"alerts"`
}

// IterationReport is returned after each runner cycle.
type IterationReport struct {
	Timestamp time.Time
	Results   []ProbeResult
	Alerts    []Alert
	Summary   Aggregates
}

// HasFailures returns true when any probe failed.
func (r IterationReport) HasFailures() bool {
	return r.Summary.Failures > 0
}
