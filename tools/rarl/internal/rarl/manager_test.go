package rarl

import (
	"testing"
	"time"
)

func baseConfig() Config {
	return Config{
		Secret:        "secret",
		WindowSeconds: 60,
		Tenants: map[string]TenantConfig{
			"tenant": {
				Tools: map[string]ToolConfig{
					"tool": {
						BaseLimit:    10,
						BurstCredits: 5,
						PriorityLanes: map[string]PriorityLaneConfig{
							"default": {Multiplier: 1, BurstBonus: 0},
							"vip":     {Multiplier: 2, BurstBonus: 5},
						},
						Risk: RiskConfig{
							DefaultMultiplier:         1,
							HighRiskPenaltyMultiplier: 0.3,
							AnomalyBuckets: []AnomalyBucket{
								{Min: 0, Max: 0.5, Multiplier: 1},
								{Min: 0.5, Max: 0.8, Multiplier: 0.6},
							},
							GeoMultipliers:        map[string]float64{"us": 1, "eu": 0.8},
							PolicyTierMultipliers: map[string]float64{"gold": 1.2, "standard": 1},
						},
					},
				},
			},
		},
	}
}

func TestDeterministicDecisions(t *testing.T) {
	mgr, err := NewManager(baseConfig())
	if err != nil {
		t.Fatalf("manager init: %v", err)
	}

	ts := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	req := DecisionRequest{
		TenantID:     "tenant",
		ToolID:       "tool",
		Units:        3,
		Geo:          "us",
		PolicyTier:   "gold",
		AnomalyScore: 0.2,
		PriorityLane: "default",
		Timestamp:    ts,
	}

	d1, err := mgr.Evaluate(req)
	if err != nil {
		t.Fatalf("eval1: %v", err)
	}
	d2, err := mgr.Evaluate(req)
	if err != nil {
		t.Fatalf("eval2: %v", err)
	}

	if d1.Allowed != d2.Allowed {
		t.Fatalf("expected deterministic allow/deny, got %#v and %#v", d1, d2)
	}
}

func TestHighRiskThrottle(t *testing.T) {
	mgr, err := NewManager(baseConfig())
	if err != nil {
		t.Fatalf("manager init: %v", err)
	}

	ts := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	lowRisk := DecisionRequest{
		TenantID:     "tenant",
		ToolID:       "tool",
		Units:        10,
		Geo:          "us",
		PolicyTier:   "standard",
		AnomalyScore: 0.2,
		Timestamp:    ts,
	}
	highRisk := lowRisk
	highRisk.AnomalyScore = 0.9

	d1, err := mgr.Evaluate(lowRisk)
	if err != nil {
		t.Fatalf("eval low risk: %v", err)
	}
	if !d1.Allowed {
		t.Fatalf("expected low risk to allow, got %#v", d1)
	}

	d2, err := mgr.Evaluate(highRisk)
	if err != nil {
		t.Fatalf("eval high risk: %v", err)
	}
	if d2.Allowed {
		t.Fatalf("expected high risk throttle, got %#v", d2)
	}
}

func TestSnapshotVerification(t *testing.T) {
	mgr, err := NewManager(baseConfig())
	if err != nil {
		t.Fatalf("manager init: %v", err)
	}
	if _, err := mgr.Evaluate(DecisionRequest{TenantID: "tenant", ToolID: "tool", Units: 2}); err != nil {
		t.Fatalf("initial eval: %v", err)
	}

	snap, signature, err := mgr.Snapshot("tenant")
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	ok, err := VerifySnapshot("secret", snap, signature)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !ok {
		t.Fatalf("expected signature verification to pass")
	}
}
