package controller

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

type AuditOutcome string

const (
	OutcomeRolledOut AuditOutcome = "rolled_out"
	OutcomeReverted  AuditOutcome = "reverted"
	OutcomeDryRun    AuditOutcome = "dry_run"
)

type AuditEvent struct {
	ManifestID    string       `json:"manifestId"`
	PolicyVersion string       `json:"policyVersion"`
	Outcome       AuditOutcome `json:"outcome"`
	Reason        string       `json:"reason"`
	Timestamp     time.Time    `json:"timestamp"`
}

type RolloutResult struct {
	Manifest   RolloutManifest   `json:"manifest"`
	Metrics    MetricsComparison `json:"metrics"`
	Breaches   []string          `json:"breaches"`
	Reverted   bool              `json:"reverted"`
	AuditEvent AuditEvent        `json:"auditEvent"`
}

type DryRunResult struct {
	Manifest RolloutManifest   `json:"manifest"`
	Metrics  MetricsComparison `json:"metrics"`
}

type Controller struct {
	mu               sync.Mutex
	currentPolicy    string
	secret           string
	auditTrail       []AuditEvent
	lastResult       *RolloutResult
	dryRunSelections map[string][]string
}

func NewController(initialPolicy, secret string) (*Controller, error) {
	if secret == "" {
		return nil, errors.New("controller requires a manifest verification secret")
	}
	return &Controller{
		currentPolicy:    initialPolicy,
		secret:           secret,
		auditTrail:       make([]AuditEvent, 0),
		dryRunSelections: make(map[string][]string),
	}, nil
}

func (c *Controller) DryRun(manifest RolloutManifest) (DryRunResult, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	manifest.Normalize()
	if err := manifest.VerifySignature(c.secret); err != nil {
		return DryRunResult{}, err
	}
	metrics := computeMetrics(manifest, c.currentPolicy)
	c.dryRunSelections[manifest.ID] = append([]string{}, manifest.CanaryPopulation...)
	event := AuditEvent{
		ManifestID:    manifest.ID,
		PolicyVersion: manifest.PolicyVersion,
		Outcome:       OutcomeDryRun,
		Reason:        "dry run simulation completed",
		Timestamp:     time.Now().UTC(),
	}
	c.auditTrail = append(c.auditTrail, event)
	return DryRunResult{
		Manifest: manifest,
		Metrics:  metrics,
	}, nil
}

func (c *Controller) Apply(manifest RolloutManifest) (RolloutResult, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	manifest.Normalize()
	if err := manifest.VerifySignature(c.secret); err != nil {
		return RolloutResult{}, err
	}
	expectedSelection, hasDryRun := c.dryRunSelections[manifest.ID]
	if hasDryRun && !equalStrings(expectedSelection, manifest.CanaryPopulation) {
		return RolloutResult{}, fmt.Errorf("canary selection does not match dry-run for manifest %s", manifest.ID)
	}

	metrics := computeMetrics(manifest, c.currentPolicy)
	breaches := evaluateBreaches(metrics, manifest.Thresholds)
	now := time.Now().UTC()
	event := AuditEvent{
		ManifestID:    manifest.ID,
		PolicyVersion: manifest.PolicyVersion,
		Outcome:       OutcomeRolledOut,
		Reason:        "rollout completed within guardrails",
		Timestamp:     now,
	}
	reverted := false
	if len(breaches) > 0 {
		event.Outcome = OutcomeReverted
		event.Reason = fmt.Sprintf("auto-reverted due to breaches: %v", breaches)
		reverted = true
	} else {
		c.currentPolicy = manifest.PolicyVersion
	}
	c.auditTrail = append(c.auditTrail, event)
	result := RolloutResult{
		Manifest:   manifest,
		Metrics:    metrics,
		Breaches:   breaches,
		Reverted:   reverted,
		AuditEvent: event,
	}
	c.lastResult = &result
	return result, nil
}

func evaluateBreaches(metrics MetricsComparison, thresholds GuardrailThresholds) []string {
	breaches := make([]string, 0)
	if metrics.Canary.BlockRate < thresholds.MinBlockRate {
		breaches = append(breaches, fmt.Sprintf("block rate %.4f below minimum %.4f", metrics.Canary.BlockRate, thresholds.MinBlockRate))
	}
	if metrics.Canary.LatencyMs > thresholds.MaxLatencyMs {
		breaches = append(breaches, fmt.Sprintf("latency %.2fms above maximum %.2fms", metrics.Canary.LatencyMs, thresholds.MaxLatencyMs))
	}
	fnDelta := metrics.Canary.FnCanaryCatches - metrics.Control.FnCanaryCatches
	if fnDelta > thresholds.MaxFnDelta {
		breaches = append(breaches, fmt.Sprintf("fn delta %.2f exceeds maximum %.2f", fnDelta, thresholds.MaxFnDelta))
	}
	return breaches
}

// EvaluateBreachesForSimulator exposes the guardrail evaluation logic for the simulator package
// without duplicating the deterministic breach computation.
func EvaluateBreachesForSimulator(metrics MetricsComparison, thresholds GuardrailThresholds) []string {
	return evaluateBreaches(metrics, thresholds)
}

func (c *Controller) AuditTrail() []AuditEvent {
	c.mu.Lock()
	defer c.mu.Unlock()
	copied := make([]AuditEvent, len(c.auditTrail))
	copy(copied, c.auditTrail)
	return copied
}

func (c *Controller) CurrentStatus() (string, *RolloutResult) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.lastResult == nil {
		return c.currentPolicy, nil
	}
	snapshot := *c.lastResult
	return c.currentPolicy, &snapshot
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
