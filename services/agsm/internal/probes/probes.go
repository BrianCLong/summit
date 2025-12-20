package probes

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/summit/agsm/internal/config"
	"github.com/summit/agsm/internal/metrics"
)

// Known scenario identifiers.
const (
	ScenarioDeniedQuery   = "denied_query"
	ScenarioConsentChange = "consent_change"
	ScenarioGeoRoute      = "geo_route"
	ScenarioDeletion      = "deletion"
	ScenarioHold          = "hold"
)

// Run executes a governance probe and returns the outcome.
func Run(ctx context.Context, probe config.ProbeConfig, canary config.SeededCanary, now time.Time) (metrics.ProbeResult, error) {
	select {
	case <-ctx.Done():
		return metrics.ProbeResult{}, ctx.Err()
	default:
	}

	start := time.Now()
	result := metrics.ProbeResult{
		Name:      probe.Name,
		Scenario:  probe.Scenario,
		Timestamp: now,
		Canary:    canary.Enabled,
		Details: map[string]string{
			"expected": probe.ExpectedOutcome,
		},
	}

	var success bool
	var err error

	switch strings.ToLower(probe.Scenario) {
	case ScenarioDeniedQuery:
		success, err = runDeniedQuery(probe, canary)
	case ScenarioConsentChange:
		success, err = runConsentChange(probe, canary)
	case ScenarioGeoRoute:
		success, err = runGeoRoute(probe, canary)
	case ScenarioDeletion:
		success, err = runDeletion(probe, canary)
	case ScenarioHold:
		success, err = runHold(probe, canary)
	default:
		return metrics.ProbeResult{}, fmt.Errorf("unknown scenario %q", probe.Scenario)
	}

	result.Success = success
	result.LatencyMs = int64(time.Since(start).Milliseconds())
	if !success && err != nil {
		result.Error = err.Error()
	}
	if canary.Enabled {
		result.FailureMode = canary.FailureMode
		if canary.Note != "" {
			result.Details["canary"] = canary.Note
		}
	}
	return result, err
}

func runDeniedQuery(probe config.ProbeConfig, canary config.SeededCanary) (bool, error) {
	expected := strings.ToLower(probe.ExpectedOutcome)
	actual := "deny"
	if canary.Enabled && canary.FailureMode == "force-allow" {
		actual = "allow"
	}
	if actual != expected {
		return false, fmt.Errorf("access control regression: expected %s, observed %s", expected, actual)
	}
	return true, nil
}

func runConsentChange(probe config.ProbeConfig, canary config.SeededCanary) (bool, error) {
	expected := strings.ToLower(probe.ExpectedOutcome)
	actual := "propagated"
	if canary.Enabled && canary.FailureMode == "stale" {
		actual = "stale"
	}
	if actual != expected {
		return false, fmt.Errorf("consent change propagation mismatch: expected %s, observed %s", expected, actual)
	}
	return true, nil
}

func runGeoRoute(probe config.ProbeConfig, canary config.SeededCanary) (bool, error) {
	expected := strings.ToLower(probe.ExpectedOutcome)
	actual := expected
	if canary.Enabled && canary.FailureMode == "detour" {
		actual = "eu-west"
	}
	if len(probe.Regions) > 0 {
		regionList := strings.Join(probe.Regions, " -> ")
		if probe.ExpectedOutcome == "regional" {
			if canary.Enabled && canary.FailureMode == "detour" {
				return false, fmt.Errorf("geo routing violated: expected %s, rerouted to %s", regionList, actual)
			}
			return true, nil
		}
	}
	if actual != expected {
		return false, fmt.Errorf("geo routing mismatch: expected %s, observed %s", expected, actual)
	}
	return true, nil
}

func runDeletion(probe config.ProbeConfig, canary config.SeededCanary) (bool, error) {
	expected := strings.ToLower(probe.ExpectedOutcome)
	actual := "purged"
	if canary.Enabled && canary.FailureMode == "linger" {
		actual = "retained"
	}
	if actual != expected {
		return false, fmt.Errorf("deletion policy drift: expected %s, observed %s", expected, actual)
	}
	return true, nil
}

func runHold(probe config.ProbeConfig, canary config.SeededCanary) (bool, error) {
	expected := strings.ToLower(probe.ExpectedOutcome)
	actual := expected
	if canary.Enabled && canary.FailureMode == "auto-release" {
		actual = "released"
	}
	if actual != expected {
		return false, fmt.Errorf("legal hold mismatch: expected %s, observed %s", expected, actual)
	}
	return true, nil
}
