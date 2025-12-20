package planner_test

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/summit/acc/internal/config"
	"github.com/summit/acc/internal/planner"
)

func loadConfig(tb testing.TB) *config.Config {
	if tb != nil {
		tb.Helper()
	}
	cfg, err := config.Load(filepath.Join("..", "..", "config", "policies.yaml"))
	if err != nil {
		if tb != nil {
			tb.Fatalf("load config: %v", err)
		}
		panic(err)
	}
	return cfg
}

func TestModeSelectionDeterministic(t *testing.T) {
	cfg := loadConfig(t)
	pl := planner.New(cfg)

	req := planner.Request{
		ID:           "req-123",
		Operation:    "read",
		DataClass:    "pii",
		Purpose:      "authentication",
		Jurisdiction: "us",
	}

	ctx := context.Background()
	first, err := pl.Plan(ctx, req)
	if err != nil {
		t.Fatalf("plan: %v", err)
	}

	for i := 0; i < 5; i++ {
		result, err := pl.Plan(ctx, req)
		if err != nil {
			t.Fatalf("plan: %v", err)
		}
		if result.Mode != first.Mode {
			t.Fatalf("expected mode %s, got %s", first.Mode, result.Mode)
		}
		if result.Route.Quorum[0] != first.Route.Quorum[0] {
			t.Fatalf("expected same quorum primary, got %s vs %s", first.Route.Quorum[0], result.Route.Quorum[0])
		}
	}
}

func TestBoundedStalenessRespectsSLA(t *testing.T) {
	cfg := loadConfig(t)
	pl := planner.New(cfg)
	if err := pl.UpdateReplica("eu-central-async", planner.ReplicaMetrics{LatencyMs: 15, StalenessMs: 180}); err != nil {
		t.Fatalf("update: %v", err)
	}

	req := planner.Request{
		ID:           "req-analytics",
		Operation:    "read",
		DataClass:    "pii",
		Purpose:      "analytics",
		Jurisdiction: "eu",
	}

	result, err := pl.Plan(context.Background(), req)
	if err != nil {
		t.Fatalf("plan: %v", err)
	}

	if result.Mode != config.ModeBoundedStaleness {
		t.Fatalf("expected bounded staleness, got %s", result.Mode)
	}
	if result.Route.Replicas[0].StalenessMs > result.SLA {
		t.Fatalf("expected staleness <= SLA (%d), got %d", result.SLA, result.Route.Replicas[0].StalenessMs)
	}

	// Exceed SLA across the fleet and ensure fallback marks strong
	staleMetrics := []struct {
		name    string
		metrics planner.ReplicaMetrics
	}{
		{"eu-central-async", planner.ReplicaMetrics{LatencyMs: 15, StalenessMs: 500}},
		{"us-east-primary", planner.ReplicaMetrics{LatencyMs: 6, StalenessMs: 500}},
		{"us-west-sync", planner.ReplicaMetrics{LatencyMs: 10, StalenessMs: 500}},
		{"ap-south-async", planner.ReplicaMetrics{LatencyMs: 25, StalenessMs: 500}},
	}
	for _, entry := range staleMetrics {
		if err := pl.UpdateReplica(entry.name, entry.metrics); err != nil {
			t.Fatalf("update: %v", err)
		}
	}

	result, err = pl.Plan(context.Background(), req)
	if err != nil {
		t.Fatalf("plan: %v", err)
	}
	if !result.Route.FallbackToStrongMode {
		t.Fatalf("expected fallback to strong when SLA exceeded")
	}
	if result.Mode != config.ModeBoundedStaleness {
		t.Fatalf("policy mode should remain bounded staleness")
	}
}

func TestReadMyWritesSessionRouting(t *testing.T) {
	cfg := loadConfig(t)
	pl := planner.New(cfg)

	sessionID := "sess-1"

	writeReq := planner.Request{
		ID:           "write-1",
		Operation:    "write",
		Session:      sessionID,
		DataClass:    "behavioral",
		Purpose:      "personalization",
		Jurisdiction: "us",
	}

	if _, err := pl.Plan(context.Background(), writeReq); err != nil {
		t.Fatalf("write plan: %v", err)
	}

	if err := pl.UpdateReplica("us-east-primary", planner.ReplicaMetrics{LatencyMs: 6, StalenessMs: 50}); err != nil {
		t.Fatalf("update primary: %v", err)
	}

	readReq := planner.Request{
		ID:           "read-1",
		Operation:    "read",
		Session:      sessionID,
		DataClass:    "behavioral",
		Purpose:      "personalization",
		Jurisdiction: "us",
	}

	result, err := pl.Plan(context.Background(), readReq)
	if err != nil {
		t.Fatalf("read plan: %v", err)
	}

	if len(result.Route.Quorum) != 1 || result.Route.Quorum[0] != "us-east-primary" {
		t.Fatalf("expected session to stick to us-east-primary, got %+v", result.Route.Quorum)
	}

	// Force staleness to exceed SLA and expect fallback
	if err := pl.UpdateReplica("us-east-primary", planner.ReplicaMetrics{LatencyMs: 6, StalenessMs: 1000}); err != nil {
		t.Fatalf("update primary: %v", err)
	}

	result, err = pl.Plan(context.Background(), readReq)
	if err != nil {
		t.Fatalf("read plan: %v", err)
	}
	if result.Route.Quorum[0] == "us-east-primary" && !result.Route.FallbackToStrongMode {
		t.Fatalf("expected fallback to strong when session replica stale")
	}
}
