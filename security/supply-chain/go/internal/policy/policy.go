package policy

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

type Policy struct {
	CVSS struct {
		MaxBaseScore      float64  `json:"maxBaseScore"`
		BlockedSeverities []string `json:"blockedSeverities"`
		GracePeriodDays   int      `json:"gracePeriodDays"`
	} `json:"cvss"`
	Licenses struct {
		Blocked         []string `json:"blocked"`
		AllowedFamilies []string `json:"allowedFamilies"`
		DualControl     struct {
			RequiredApprovals int      `json:"requiredApprovals"`
			ApproverRoles     []string `json:"approverRoles"`
		} `json:"dualControl"`
	} `json:"licenses"`
	Attestations struct {
		Signing                string   `json:"signing"`
		PredicateTypes         []string `json:"predicateTypes"`
		ComplianceCenterBucket string   `json:"complianceCenterBucket"`
	} `json:"attestations"`
}

type Vulnerability struct {
	ID           string  `json:"id"`
	Package      string  `json:"package"`
	Severity     string  `json:"severity"`
	CVSS         float64 `json:"cvss"`
	FixedVersion string  `json:"fixedVersion"`
}

type VulnerabilityReport struct {
	Vulnerabilities []Vulnerability `json:"vulnerabilities"`
}

type VulnerabilityResult struct {
	CheckedAt  time.Time `json:"checkedAt"`
	Violations []string  `json:"violations"`
}

func Load(path string) (Policy, error) {
	var p Policy
	data, err := os.ReadFile(path)
	if err != nil {
		return p, err
	}
	if err := json.Unmarshal(data, &p); err != nil {
		return p, err
	}
	return p, nil
}

func LoadVulnerabilities(path string) (VulnerabilityReport, error) {
	var r VulnerabilityReport
	data, err := os.ReadFile(path)
	if err != nil {
		return r, err
	}
	if err := json.Unmarshal(data, &r); err != nil {
		return r, err
	}
	return r, nil
}

func EvaluateVulns(p Policy, report VulnerabilityReport) VulnerabilityResult {
	blocked := map[string]struct{}{}
	for _, sev := range p.CVSS.BlockedSeverities {
		blocked[strings.ToLower(sev)] = struct{}{}
	}
	result := VulnerabilityResult{CheckedAt: time.Now().UTC()}
	for _, v := range report.Vulnerabilities {
		sev := strings.ToLower(v.Severity)
		if _, found := blocked[sev]; found {
			result.Violations = append(result.Violations, fmt.Sprintf("%s severity %s is blocked", v.ID, v.Severity))
		}
		if v.CVSS > p.CVSS.MaxBaseScore {
			result.Violations = append(result.Violations, fmt.Sprintf("%s CVSS %.1f exceeds %.1f", v.ID, v.CVSS, p.CVSS.MaxBaseScore))
		}
	}
	return result
}
