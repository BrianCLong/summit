package engine_test

import (
	"testing"

	"github.com/summit/cab/internal/challenge"
	"github.com/summit/cab/internal/engine"
	"github.com/summit/cab/internal/risk"
)

func newTestEngine(t *testing.T) *engine.Engine {
	t.Helper()
	policies := []engine.Policy{
		{
			ID:               "test-policy",
			Actions:          []string{"workspace:update"},
			Subject:          map[string]engine.AttributeCondition{"role": {Equals: "admin"}},
			Resource:         map[string]engine.AttributeCondition{"classification": {Equals: "internal"}},
			Effect:           engine.DecisionAllow,
			AllowRisk:        risk.LevelLow,
			StepUpRisk:       risk.LevelMedium,
			StepUpChallenges: []string{"totp", "hardware-key"},
		},
	}
	scorers := []risk.Scorer{
		risk.GeoScorer{Allowed: []string{"us"}, UnknownIsRisk: true},
		risk.DevicePostureScorer{TrustedPostures: []string{"trusted"}},
		risk.AnomalyScorer{Name: "anomaly", StepUpFloor: 0.4, DenyFloor: 0.8},
	}
	registry := challenge.NewRegistry(
		challenge.NewTOTPChallenge("654321"),
		challenge.NewHardwareKeyChallenge("cab-hardware-assertion"),
	)
	eng, err := engine.New(policies, scorers, registry)
	if err != nil {
		t.Fatalf("failed to create engine: %v", err)
	}
	return eng
}

func baseRequest() engine.Request {
	return engine.Request{
		Action:   "workspace:update",
		Subject:  map[string]string{"role": "admin"},
		Resource: map[string]string{"classification": "internal"},
		Signals: risk.Signals{
			Geo:           "US",
			DevicePosture: "trusted",
			AnomalyScore:  0.2,
		},
	}
}

func TestDeterministicDecision(t *testing.T) {
	eng := newTestEngine(t)
	req := baseRequest()
	first, err := eng.Evaluate(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	second, err := eng.Evaluate(req)
	if err != nil {
		t.Fatalf("unexpected error on second evaluation: %v", err)
	}
	if first.Decision != second.Decision || first.RiskLevel != second.RiskLevel {
		t.Fatalf("expected deterministic results, got %v and %v", first, second)
	}
}

func TestStepUpRequiredAndSatisfied(t *testing.T) {
	eng := newTestEngine(t)
	req := baseRequest()
	req.Signals.AnomalyScore = 0.5 // triggers step-up window
	resp, err := eng.Evaluate(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Decision != engine.DecisionStepUp {
		t.Fatalf("expected step-up decision, got %s", resp.Decision)
	}
	if len(resp.RequiredChallenges) != 2 {
		t.Fatalf("expected both challenges, got %d", len(resp.RequiredChallenges))
	}

	req.ChallengeResponses = map[string]challenge.VerificationInput{
		"totp":         {"code": "654321"},
		"hardware-key": {"assertion": "cab-hardware-assertion"},
	}
	resp, err = eng.Evaluate(req)
	if err != nil {
		t.Fatalf("unexpected error when verifying: %v", err)
	}
	if resp.Decision != engine.DecisionAllow {
		t.Fatalf("expected allow after step-up, got %s", resp.Decision)
	}
}

func TestHighRiskDenied(t *testing.T) {
	eng := newTestEngine(t)
	req := baseRequest()
	req.Signals.AnomalyScore = 0.95
	req.Signals.DevicePosture = "compromised"
	resp, err := eng.Evaluate(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Decision != engine.DecisionDeny {
		t.Fatalf("expected deny, got %s", resp.Decision)
	}
}
