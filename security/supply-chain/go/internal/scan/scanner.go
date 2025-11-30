package scan

import (
	"encoding/json"
	"fmt"
	"os"

	"summit/security/supplychain/internal/policy"
)

// Report is a minimal vulnerability report used for gating.
type Report struct {
	Source          string                 `json:"source"`
	Vulnerabilities []policy.Vulnerability `json:"vulnerabilities"`
}

// LoadReport parses a scanner report from disk.
func LoadReport(path string) (Report, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return Report{}, fmt.Errorf("read report: %w", err)
	}

	var r Report
	if err := json.Unmarshal(content, &r); err != nil {
		return Report{}, fmt.Errorf("parse report: %w", err)
	}

	return r, nil
}

// Gate evaluates the report against the supplied policy.
func Gate(r Report, p policy.Policy) ([]policy.Vulnerability, bool) {
	return policy.GateVulnerabilities(r.Vulnerabilities, p)
}
