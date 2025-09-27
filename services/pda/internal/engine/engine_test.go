package engine

import (
	"context"
	"strings"
	"testing"
	"time"
)

func seedEngine() *Engine {
	eng := New(Config{DefaultSuppression: time.Minute, MaxTraces: 64})
	eng.LoadContracts([]ConsentContract{
		{
			ID:     "consent-a",
			Tenant: "acme",
			EndpointPolicies: map[string]EndpointPolicy{
				"analytics": {
					EndpointPurpose:   "analytics",
					AllowedPurposes:   []string{"analytics", "monitoring"},
					Owners:            []string{"data-observability"},
					SuppressionWindow: 2 * time.Minute,
				},
				"marketing": {
					EndpointPurpose:   "marketing",
					AllowedPurposes:   []string{"marketing"},
					Owners:            []string{"growth-ops"},
					SuppressionWindow: 4 * time.Minute,
				},
			},
		},
	})
	return eng
}

func TestEvaluateDetectsDriftAndSuppression(t *testing.T) {
	eng := seedEngine()

	driftEvent := Event{
		ID:              "evt-1",
		ConsentID:       "consent-a",
		DeclaredPurpose: "analytics",
		EndpointPurpose: "marketing",
		ObservedAt:      time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
	}

	verdict := eng.Evaluate(driftEvent)
	if !verdict.Drift {
		t.Fatalf("expected drift verdict")
	}
	if verdict.Suppressed {
		t.Fatalf("first alert should not be suppressed")
	}
	if verdict.Owner != "growth-ops" {
		t.Fatalf("unexpected owner: %s", verdict.Owner)
	}

	suppressed := eng.Evaluate(Event{
		ID:              "evt-2",
		ConsentID:       "consent-a",
		DeclaredPurpose: "analytics",
		EndpointPurpose: "marketing",
		ObservedAt:      time.Date(2024, 1, 1, 0, 1, 0, 0, time.UTC),
	})
	if !suppressed.Drift || !suppressed.Suppressed {
		t.Fatalf("expected suppressed drift, got %#v", suppressed)
	}

	trace, err := eng.Explain("evt-1")
	if err != nil {
		t.Fatalf("expected trace: %v", err)
	}
	if trace.Verdict != "drift" {
		t.Fatalf("unexpected trace verdict: %s", trace.Verdict)
	}
	if len(trace.Steps) == 0 {
		t.Fatalf("expected trace steps")
	}
}

func TestFalsePositiveRateRespectsControlStreams(t *testing.T) {
	eng := seedEngine()

	aligned := Event{
		ID:              "evt-clean",
		ConsentID:       "consent-a",
		DeclaredPurpose: "analytics",
		EndpointPurpose: "analytics",
		StreamKind:      "control",
		ObservedAt:      time.Now().UTC(),
	}

	verdict := eng.Evaluate(aligned)
	if verdict.Drift {
		t.Fatalf("expected aligned event to pass")
	}
	if rate := eng.FalsePositiveRate(); rate > 0 {
		t.Fatalf("expected zero false positive rate, got %f", rate)
	}

	drift := aligned
	drift.ID = "evt-clean-drift"
	drift.DeclaredPurpose = "marketing"
	drift.EndpointPurpose = "analytics"
	drift.ObservedAt = drift.ObservedAt.Add(time.Minute)

	verdict = eng.Evaluate(drift)
	if !verdict.Drift || !verdict.FalsePositive {
		t.Fatalf("expected false positive drift on control stream: %#v", verdict)
	}
	if rate := eng.FalsePositiveRate(); rate <= 0 {
		t.Fatalf("expected non-zero false positive rate")
	}
}

func TestStreamRuleUpdates(t *testing.T) {
	eng := seedEngine()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	updates := make(chan RuleUpdate, 1)
	go eng.StartRuleStream(ctx, updates)

	payload := `{"contractId":"consent-a","policy":{"endpointPurpose":"ads","allowedPurposes":["ads"],"owners":["ads-team"],"suppressionWindow":300000000000},"version":1}`
	if err := StreamRuleUpdates(ctx, strings.NewReader(payload), updates); err != nil {
		t.Fatalf("stream update failed: %v", err)
	}

	time.Sleep(10 * time.Millisecond)

	contracts := eng.SnapshotContracts()
	found := false
	for _, c := range contracts {
		if _, ok := c.EndpointPolicies["ads"]; ok {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected new policy to be installed")
	}
}
