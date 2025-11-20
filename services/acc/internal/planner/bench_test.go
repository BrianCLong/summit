package planner_test

import (
	"context"
	"testing"

	"github.com/summit/acc/internal/planner"
)

func benchmarkPlanner(b *testing.B, req planner.Request) {
	cfg := loadConfig(b)
	pl := planner.New(cfg)
	ctx := context.Background()

	// warm up
	if _, err := pl.Plan(ctx, req); err != nil {
		b.Fatalf("warm up plan: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := pl.Plan(ctx, req); err != nil {
			b.Fatalf("plan: %v", err)
		}
	}
}

func BenchmarkPlannerStrong(b *testing.B) {
	benchmarkPlanner(b, planner.Request{
		ID:           "bench-strong",
		Operation:    "read",
		DataClass:    "pii",
		Purpose:      "authentication",
		Jurisdiction: "us",
	})
}

func BenchmarkPlannerBounded(b *testing.B) {
	benchmarkPlanner(b, planner.Request{
		ID:           "bench-bounded",
		Operation:    "read",
		DataClass:    "pii",
		Purpose:      "analytics",
		Jurisdiction: "eu",
	})
}

func BenchmarkPlannerReadMyWrites(b *testing.B) {
	benchmarkPlanner(b, planner.Request{
		ID:           "bench-rmw",
		Operation:    "read",
		Session:      "bench-session",
		DataClass:    "behavioral",
		Purpose:      "personalization",
		Jurisdiction: "us",
	})
}
