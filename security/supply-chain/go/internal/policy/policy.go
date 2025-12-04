package policy

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
)

// Policy captures supply-chain gates and exception rules.
type Policy struct {
	BaselineCVSS        float64            `yaml:"baseline_cvss"`
	BlockedLicenses     []string           `yaml:"blocked_licenses"`
	AllowedLicenses     []string           `yaml:"allowed_licenses"`
	DualControl         DualControl        `yaml:"dual_control"`
	ExceptionWindowDays int                `yaml:"exception_window_days"`
	ReproducibleBuilds  ReproducibleBuilds `yaml:"reproducible_builds"`
}

// DualControl defines minimum approvers for license exceptions.
type DualControl struct {
	MinimumApprovers int      `yaml:"minimum_approvers"`
	Approvers        []string `yaml:"approvers"`
}

// ReproducibleBuilds configures attestation expectations.
type ReproducibleBuilds struct {
	AttestationRequired bool   `yaml:"attestation_required"`
	ProvenanceFormat    string `yaml:"provenance_format"`
}

// Vulnerability describes a scanner finding.
type Vulnerability struct {
	ID    string
	CVSS  float64
	Fix   string
	Title string
}

// LicenseException holds dual-control information.
type LicenseException struct {
	License   string
	Approvers []string
}

// Load reads the policy YAML file from disk.
func Load(path string) (Policy, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return Policy{}, fmt.Errorf("read policy: %w", err)
	}

	var p Policy
	if err := json.Unmarshal(content, &p); err != nil {
		return Policy{}, fmt.Errorf("parse policy: %w", err)
	}

	if p.DualControl.MinimumApprovers == 0 {
		p.DualControl.MinimumApprovers = 2
	}

	return p, nil
}

// GateVulnerabilities enforces the baseline CVSS threshold.
func GateVulnerabilities(findings []Vulnerability, p Policy) ([]Vulnerability, bool) {
	failing := make([]Vulnerability, 0)
	for _, f := range findings {
		if f.CVSS >= p.BaselineCVSS {
			failing = append(failing, f)
		}
	}
	return failing, len(failing) == 0
}

// GateLicenses enforces blocked licenses and dual-control exceptions.
func GateLicenses(licenses []string, exceptions []LicenseException, p Policy) ([]string, bool, error) {
	blocked := make([]string, 0)
	exceptionMap := make(map[string]LicenseException)
	for _, ex := range exceptions {
		exceptionMap[ex.License] = ex
	}

	for _, lic := range licenses {
		if !contains(p.BlockedLicenses, lic) {
			continue
		}

		if ex, ok := exceptionMap[lic]; ok {
			if !dualControlSatisfied(ex.Approvers, p.DualControl.MinimumApprovers) {
				return blocked, false, fmt.Errorf("license %s missing dual-control approvers", lic)
			}
			continue
		}

		blocked = append(blocked, lic)
	}

	return blocked, len(blocked) == 0, nil
}

// ValidateAttestation asserts reproducible build rules are satisfied.
func ValidateAttestation(attested bool, p Policy) error {
	if p.ReproducibleBuilds.AttestationRequired && !attested {
		return errors.New("attestation required but missing")
	}
	return nil
}

func dualControlSatisfied(approvers []string, minimum int) bool {
	unique := make(map[string]struct{})
	for _, a := range approvers {
		unique[a] = struct{}{}
	}
	return len(unique) >= minimum
}

func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}
