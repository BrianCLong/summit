package runner

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/summit/agsm/internal/config"
	"github.com/summit/agsm/internal/storage"
)

func TestRunnerDetectsSeededFailures(t *testing.T) {
	cfgPath := filepath.Join("..", "..", "config", "profile.canary.yaml")
	cfg, err := config.Load(cfgPath)
	if err != nil {
		t.Fatalf("load canary config: %v", err)
	}

	tmp := t.TempDir()
	store := storage.NewFileStorage(filepath.Join(tmp, "metrics.json"))
	fixed := time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)
	run := New(cfg, store, WithNow(func() time.Time { return fixed }))

	report, err := run.RunIteration(context.Background())
	if err != nil {
		t.Fatalf("run iteration: %v", err)
	}

	if !report.HasFailures() {
		t.Fatalf("expected seeded canaries to fail")
	}

	var sloAlertFound bool
	for _, alert := range report.Alerts {
		if alert.Metric == "successRate" {
			sloAlertFound = true
		}
	}
	if !sloAlertFound {
		t.Fatalf("expected success rate alert for canary profile")
	}

	state, err := store.Load()
	if err != nil {
		t.Fatalf("reload state: %v", err)
	}
	if state.Aggregates.Failures == 0 {
		t.Fatalf("expected persisted failures in metrics state")
	}
	if state.Aggregates.Total != len(cfg.Probes) {
		t.Fatalf("expected %d probes recorded, got %d", len(cfg.Probes), state.Aggregates.Total)
	}
}
