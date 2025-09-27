package models

import "time"

// Severity represents the qualitative severity of a finding.
type Severity string

const (
	SeverityCritical Severity = "critical"
	SeverityHigh     Severity = "high"
	SeverityMedium   Severity = "medium"
	SeverityLow      Severity = "low"
)

// Finding captures a single detection event produced by the scanner.
type Finding struct {
	ID          string            `json:"id"`
	Detector    string            `json:"detector"`
	RuleID      string            `json:"ruleId"`
	Description string            `json:"description"`
	FilePath    string            `json:"filePath"`
	Line        int               `json:"line"`
	Column      int               `json:"column"`
	SecretType  string            `json:"secretType"`
	Match       string            `json:"match"`
	Context     string            `json:"context"`
	Severity    Severity          `json:"severity"`
	Confidence  float64           `json:"confidence"`
	ReportedAt  time.Time         `json:"reportedAt"`
	Quarantined bool              `json:"quarantined"`
	AutoRotated bool              `json:"autoRotated"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}
