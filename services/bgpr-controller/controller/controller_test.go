package controller_test

import (
	"testing"
	"time"

	"github.com/summit/bgpr/controller"
)

const secret = "super-secret"

func signedManifest(t *testing.T, id, version string, canary, control []string, thresholds controller.GuardrailThresholds) controller.RolloutManifest {
	t.Helper()
	manifest := controller.RolloutManifest{
		ID:                id,
		PolicyVersion:     version,
		CanaryPopulation:  append([]string{}, canary...),
		ControlPopulation: append([]string{}, control...),
		Thresholds:        thresholds,
		CreatedAt:         time.Date(2025, time.January, 1, 0, 0, 0, 0, time.UTC),
	}
	manifest.Normalize()
	sig, err := manifest.ComputeSignature(secret)
	if err != nil {
		t.Fatalf("compute signature: %v", err)
	}
	manifest.Signature = sig
	return manifest
}

func TestDeterministicMetrics(t *testing.T) {
	ctrl, err := controller.NewController("policy-v1", secret)
	if err != nil {
		t.Fatalf("new controller: %v", err)
	}
	thresholds := controller.GuardrailThresholds{MinBlockRate: 0.7, MaxLatencyMs: 110, MaxFnDelta: 5}
	manifest := signedManifest(t, "m-1", "policy-v2", []string{"a", "b"}, []string{"c", "d"}, thresholds)

	dryRun1, err := ctrl.DryRun(manifest)
	if err != nil {
		t.Fatalf("dry run 1: %v", err)
	}
	dryRun2, err := ctrl.DryRun(manifest)
	if err != nil {
		t.Fatalf("dry run 2: %v", err)
	}
	if dryRun1.Metrics != dryRun2.Metrics {
		t.Fatalf("expected deterministic metrics, got %#v and %#v", dryRun1.Metrics, dryRun2.Metrics)
	}
}

func TestGuardrailBreachTriggersRevert(t *testing.T) {
	ctrl, err := controller.NewController("policy-v1", secret)
	if err != nil {
		t.Fatalf("new controller: %v", err)
	}
	thresholds := controller.GuardrailThresholds{MinBlockRate: 0.95, MaxLatencyMs: 50, MaxFnDelta: 0}
	manifest := signedManifest(t, "m-2", "policy-v2", []string{"c1", "c2"}, []string{"d1", "d2"}, thresholds)

	if _, err := ctrl.DryRun(manifest); err != nil {
		t.Fatalf("dry run: %v", err)
	}

	result, err := ctrl.Apply(manifest)
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	if !result.Reverted {
		t.Fatalf("expected rollout to revert due to guardrail breach")
	}
	if len(result.Breaches) == 0 {
		t.Fatalf("expected breaches to be reported")
	}
	audit := ctrl.AuditTrail()
	if len(audit) == 0 {
		t.Fatalf("expected audit trail entries")
	}
	last := audit[len(audit)-1]
	if last.Outcome != controller.OutcomeReverted {
		t.Fatalf("expected last audit outcome reverted, got %s", last.Outcome)
	}
}

func TestDryRunSelectionMustMatch(t *testing.T) {
	ctrl, err := controller.NewController("policy-v1", secret)
	if err != nil {
		t.Fatalf("new controller: %v", err)
	}
	thresholds := controller.GuardrailThresholds{MinBlockRate: 0.7, MaxLatencyMs: 110, MaxFnDelta: 5}
	manifest := signedManifest(t, "m-3", "policy-v2", []string{"p1", "p2"}, []string{"q1", "q2"}, thresholds)

	if _, err := ctrl.DryRun(manifest); err != nil {
		t.Fatalf("dry run: %v", err)
	}

	// Change the canary selection to trigger mismatch.
	manifest.CanaryPopulation = []string{"p2", "p3"}
	manifest.Normalize()
	sig, err := manifest.ComputeSignature(secret)
	if err != nil {
		t.Fatalf("compute signature: %v", err)
	}
	manifest.Signature = sig

	if _, err := ctrl.Apply(manifest); err == nil {
		t.Fatalf("expected apply to fail when selection differs from dry-run")
	}
}
