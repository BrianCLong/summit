package simulator_test

import (
	"testing"
	"time"

	"github.com/summit/bgpr/controller"
	"github.com/summit/bgpr/simulator"
)

const manifestSecret = "super-secret"

func TestSimulatorMatchesDryRun(t *testing.T) {
	ctrl, err := controller.NewController("policy-v1", manifestSecret)
	if err != nil {
		t.Fatalf("new controller: %v", err)
	}
	sim := simulator.New(ctrl)
	manifest := controller.RolloutManifest{
		ID:                "sim-1",
		PolicyVersion:     "policy-v2",
		CanaryPopulation:  []string{"x1", "x2"},
		ControlPopulation: []string{"y1", "y2"},
		Thresholds: controller.GuardrailThresholds{
			MinBlockRate: 0.7,
			MaxLatencyMs: 110,
			MaxFnDelta:   5,
		},
		CreatedAt: time.Date(2025, time.January, 1, 0, 0, 0, 0, time.UTC),
	}
	manifest.Normalize()
	sig, err := manifest.ComputeSignature(manifestSecret)
	if err != nil {
		t.Fatalf("compute signature: %v", err)
	}
	manifest.Signature = sig

	result, err := sim.Execute(manifest)
	if err != nil {
		t.Fatalf("simulate: %v", err)
	}
	if len(result.Breaches) != 0 {
		t.Fatalf("expected no breaches during simulation, got %v", result.Breaches)
	}

	// Applying after simulation should succeed because selection matches.
	if _, err := ctrl.Apply(manifest); err != nil {
		t.Fatalf("apply after simulation: %v", err)
	}
}
