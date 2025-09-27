package plan_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/summit/osrp/internal/plan"
)

func testConfig(t *testing.T) plan.PlannerConfig {
	t.Helper()
	cfgPath := resolvePath(t, "config", "default.json")
	raw, err := os.ReadFile(cfgPath)
	if err != nil {
		t.Fatalf("read config: %v", err)
	}
	var cfg plan.PlannerConfig
	if err := json.Unmarshal(raw, &cfg); err != nil {
		t.Fatalf("unmarshal config: %v", err)
	}
	cfg.SigningKeyPath = resolvePath(t, "fixtures", "test-ed25519-priv.key")
	return cfg
}

func loadFixture(t *testing.T, name string) plan.RolloutFixture {
	t.Helper()
	path := resolvePath(t, "fixtures", name)
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	var fx plan.RolloutFixture
	if err := json.Unmarshal(raw, &fx); err != nil {
		t.Fatalf("unmarshal fixture: %v", err)
	}
	return fx
}

func newTestPlanner(t *testing.T) *plan.Planner {
	t.Helper()
	cfg := testConfig(t)
	signer, err := plan.NewManifestSignerFromFile(cfg.SigningKeyPath)
	if err != nil {
		t.Fatalf("signer: %v", err)
	}
	planner, err := plan.NewPlanner(cfg, signer)
	if err != nil {
		t.Fatalf("planner: %v", err)
	}
	return planner
}

func resolvePath(t *testing.T, parts ...string) string {
	t.Helper()
	join := filepath.Join(parts...)
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	dir := cwd
	for {
		candidate := filepath.Join(dir, join)
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
		alt := filepath.Join(dir, "services", "osrp", join)
		if _, err := os.Stat(alt); err == nil {
			return alt
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	t.Fatalf("file not found: %s", join)
	return ""
}

func TestPlannerHonorsGuardrails(t *testing.T) {
	planner := newTestPlanner(t)
	fx := loadFixture(t, "rollout_success.json")

	result, err := planner.Plan(fx)
	if err != nil {
		t.Fatalf("plan: %v", err)
	}

	if result.Manifest.AutoRevert.Enabled {
		t.Fatalf("expected auto-revert disabled, got enabled with reason %q", result.Manifest.AutoRevert.Reason)
	}

	if len(result.Breaches) != 0 {
		t.Fatalf("expected zero breaches, got %d", len(result.Breaches))
	}

	for _, stage := range result.Manifest.Stages {
		if stage.Status != "approved" {
			t.Fatalf("expected stage %s to be approved, got %s", stage.Name, stage.Status)
		}
	}

	for _, guardrail := range result.Manifest.Guardrails {
		if guardrail.Status != "pass" {
			t.Fatalf("expected guardrail %s to pass, got %s", guardrail.Guardrail, guardrail.Status)
		}
	}
}

func TestPlannerTriggersAutoRevertOnBreach(t *testing.T) {
	planner := newTestPlanner(t)
	fx := loadFixture(t, "rollout_failure.json")

	result, err := planner.Plan(fx)
	if err != nil {
		t.Fatalf("plan: %v", err)
	}

	if !result.Manifest.AutoRevert.Enabled {
		t.Fatalf("expected auto-revert to be enabled")
	}
	if result.Manifest.AutoRevert.Trigger != "policy-and-product-violation" {
		t.Fatalf("unexpected trigger %q", result.Manifest.AutoRevert.Trigger)
	}
	if len(result.Breaches) == 0 {
		t.Fatalf("expected breaches recorded")
	}

	haltedCount := 0
	for _, stage := range result.Manifest.Stages {
		if stage.Status == "halted" {
			haltedCount++
		}
	}
	if haltedCount == 0 {
		t.Fatalf("expected at least one halted stage")
	}

	foundBlock := false
	foundLatency := false
	for _, breach := range result.Breaches {
		if breach.Guardrail == "block-rate" {
			foundBlock = true
		}
		if breach.Guardrail == "latency-p95" || breach.Guardrail == "business-kpi" {
			foundLatency = true
		}
	}
	if !foundBlock || !foundLatency {
		t.Fatalf("expected block-rate and product guardrail breaches, got %+v", result.Breaches)
	}
}

func TestManifestDeterministic(t *testing.T) {
	planner := newTestPlanner(t)
	fx := loadFixture(t, "rollout_success.json")

	resultOne, err := planner.Plan(fx)
	if err != nil {
		t.Fatalf("first plan: %v", err)
	}
	resultTwo, err := planner.Plan(fx)
	if err != nil {
		t.Fatalf("second plan: %v", err)
	}

	manifestOne, err := json.Marshal(resultOne.Manifest)
	if err != nil {
		t.Fatalf("marshal manifest one: %v", err)
	}
	manifestTwo, err := json.Marshal(resultTwo.Manifest)
	if err != nil {
		t.Fatalf("marshal manifest two: %v", err)
	}

	if string(manifestOne) != string(manifestTwo) {
		t.Fatalf("expected deterministic manifest output\n%s\n%s", string(manifestOne), string(manifestTwo))
	}
}
