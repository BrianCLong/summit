package crp

import (
	"context"
	"reflect"
	"testing"
	"time"
)

func set(values ...string) map[string]struct{} {
	m := make(map[string]struct{}, len(values))
	for _, v := range values {
		m[v] = struct{}{}
	}
	return m
}

func TestProcessorDeterministicPropagationAndReplay(t *testing.T) {
	experiments := map[string]map[string]struct{}{
		"exp-a": set("user-123"),
		"exp-b": set("user-456"),
	}

	features := map[string]map[string]struct{}{
		"feature-alpha": set("user-123", "user-456"),
		"feature-beta":  set("user-456"),
	}

	caches := map[string]map[string]struct{}{
		"profile-cache":        set("user-123"),
		"recommendation-cache": set("user-123", "user-456"),
	}

	routes := map[string]string{
		"user-123": "shard-a",
		"user-456": "shard-b",
	}

	processor := NewProcessor(
		NewMemoryRepository(),
		NewExperimentAssignments(experiments),
		NewFeatureMaterializer(features),
		NewCacheInvalidator(caches),
		NewQueryRouter(routes),
	)

	event := Event{
		ID:        "evt-001",
		SubjectID: "user-123",
		ConsentID: "consent-42",
		RevokedAt: time.Date(2025, time.January, 1, 0, 0, 0, 0, time.UTC),
		Metadata:  map[string]string{"source": "unit-test"},
	}

	ctx := context.Background()
	result, err := processor.ProcessEvent(ctx, event)
	if err != nil {
		t.Fatalf("ProcessEvent returned error: %v", err)
	}

	if len(result.Actions) != 4 {
		t.Fatalf("expected 4 actions, got %d", len(result.Actions))
	}

	if _, ok := experiments["exp-a"]["user-123"]; ok {
		t.Fatal("subject still present in experiments after propagation")
	}

	if _, ok := features["feature-alpha"]["user-123"]; ok {
		t.Fatal("subject still present in feature materialization")
	}

	if _, ok := caches["profile-cache"]["user-123"]; ok {
		t.Fatal("subject still present in cache")
	}

	if _, ok := routes["user-123"]; ok {
		t.Fatal("subject still present in query router")
	}

	replayResult, err := processor.ProcessEvent(ctx, event)
	if err != nil {
		t.Fatalf("ProcessEvent replay returned error: %v", err)
	}

	if !reflect.DeepEqual(result, replayResult) {
		t.Fatalf("expected idempotent replay to return identical result, diff: %#v vs %#v", result, replayResult)
	}

	report, err := processor.Reconcile(ctx, "user-123")
	if err != nil {
		t.Fatalf("Reconcile returned error: %v", err)
	}

	if report.DriftDetected {
		t.Fatalf("expected zero drift, got report: %+v", report)
	}

	for _, system := range report.Systems {
		if system.SubjectPresent {
			t.Fatalf("expected subject to be absent in %s, got %+v", system.System, system)
		}
	}

	results, err := processor.Replay(ctx, []Event{event})
	if err != nil {
		t.Fatalf("Replay returned error: %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected exactly one result from replay, got %d", len(results))
	}

	if !reflect.DeepEqual(results[0], result) {
		t.Fatalf("replay stored result mismatch: expected %#v, got %#v", result, results[0])
	}
}
