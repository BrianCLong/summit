package evaluator

import (
	"testing"
	"time"

	"github.com/summit/caff/policy"
)

func TestEvaluateDeterministic(t *testing.T) {
	flag := policy.Flag{
		Key:           "demo",
		Purposes:      []string{"analytics"},
		Jurisdictions: []string{"US"},
		Audiences:     []string{"beta"},
		ExpiresAt:     time.Now().Add(24 * time.Hour),
		Rollout:       policy.Rollout{Percentage: 50},
	}
	ctx := policy.SubjectContext{
		SubjectID:    "user-123",
		Jurisdiction: "US",
		Audiences:    []string{"beta"},
		Consents:     map[string]string{"analytics": "granted"},
		EvaluatedAt:  time.Now().UTC(),
	}

	eval := New()
	first := eval.Evaluate(flag, ctx)
	second := eval.Evaluate(flag, ctx)

	if first.Decision != second.Decision {
		t.Fatalf("expected deterministic decision, got %s and %s", first.Decision, second.Decision)
	}
	if len(first.ExplainPath) == 0 {
		t.Fatalf("expected explain path")
	}
}

func TestEvaluateStepUpWhenConsentMissing(t *testing.T) {
	flag := policy.Flag{
		Key:       "demo",
		Purposes:  []string{"ads"},
		ExpiresAt: time.Now().Add(24 * time.Hour),
		Rollout:   policy.DefaultRollout(),
	}
	ctx := policy.SubjectContext{SubjectID: "abc"}
	result := New().Evaluate(flag, ctx)
	if result.Decision != policy.DecisionStepUp {
		t.Fatalf("expected step-up, got %s", result.Decision)
	}
}
