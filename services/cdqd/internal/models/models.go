package models

import "time"

// DataPoint represents a single observation in a metric stream.
type DataPoint struct {
	Metric    string            `json:"metric"`
	Entity    string            `json:"entity"`
	Timestamp time.Time         `json:"timestamp"`
	Value     float64           `json:"value"`
	Tags      map[string]string `json:"tags,omitempty"`
}

// MetricConfig controls how a metric stream is modeled.
type MetricConfig struct {
	SeasonLength     int     `json:"seasonLength"`
	Alpha            float64 `json:"alpha"`
	Beta             float64 `json:"beta"`
	Gamma            float64 `json:"gamma"`
	Sensitivity      float64 `json:"sensitivity"`
	ResidualWindow   int     `json:"residualWindow"`
	RobustZWindow    int     `json:"robustZWindow"`
	RobustZThreshold float64 `json:"robustZThreshold"`
}

// DetectionResult explains why an anomaly or violation was emitted.
type DetectionResult struct {
	Algorithm string         `json:"algorithm"`
	Score     float64        `json:"score"`
	Threshold float64        `json:"threshold"`
	Details   map[string]any `json:"details,omitempty"`
}

// Anomaly captures a violation raised by the service.
type Anomaly struct {
	ID              string            `json:"id"`
	Sequence        int64             `json:"sequence"`
	Timestamp       time.Time         `json:"timestamp"`
	Target          string            `json:"target"`
	Entity          string            `json:"entity,omitempty"`
	Metric          string            `json:"metric,omitempty"`
	Value           float64           `json:"value,omitempty"`
	Expected        float64           `json:"expected,omitempty"`
	Score           float64           `json:"score,omitempty"`
	Type            string            `json:"type"`
	RuleID          string            `json:"ruleId,omitempty"`
	RuleDescription string            `json:"ruleDescription,omitempty"`
	Explanations    []DetectionResult `json:"explanations"`
	Payload         map[string]any    `json:"payload,omitempty"`
}

// Suppression silences alerts for a target during a window.
type Suppression struct {
	ID        string    `json:"id"`
	Target    string    `json:"target"`
	Entity    string    `json:"entity,omitempty"`
	Start     time.Time `json:"start"`
	End       time.Time `json:"end"`
	Reason    string    `json:"reason"`
	CreatedBy string    `json:"createdBy,omitempty"`
}

// Condition expresses a logical predicate for denial constraints.
type Condition struct {
	All      []Condition `json:"all,omitempty"`
	Any      []Condition `json:"any,omitempty"`
	Field    string      `json:"field,omitempty"`
	Operator string      `json:"operator,omitempty"`
	Value    any         `json:"value,omitempty"`
	Not      bool        `json:"not,omitempty"`
}

// Rule defines a semantic check enforced on records.
type Rule struct {
	ID            string     `json:"id"`
	Dataset       string     `json:"dataset"`
	Type          string     `json:"type"`
	Description   string     `json:"description"`
	Condition     *Condition `json:"condition,omitempty"`
	UniqueFields  []string   `json:"uniqueFields,omitempty"`
	NotNullFields []string   `json:"notNullFields,omitempty"`
	Enabled       bool       `json:"enabled"`
}

// Record represents a single dataset row.
type Record struct {
	Dataset   string         `json:"dataset"`
	Timestamp time.Time      `json:"timestamp"`
	Values    map[string]any `json:"values"`
}

// ReplayResult captures the outcome of a deterministic replay.
type ReplayResult struct {
	Matched   bool      `json:"matched"`
	Anomalies []Anomaly `json:"anomalies"`
}
