package engine

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestDeterministicReplay(t *testing.T) {
	eng := seedEngine()

	driftPath := filepath.Join("..", "..", "testdata", "drift.ndjson")
	f, err := os.Open(driftPath)
	if err != nil {
		t.Fatalf("open drift fixture: %v", err)
	}
	defer f.Close()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	alertsRunOne, err := eng.ReplayFromReader(ctx, f)
	if err != nil {
		t.Fatalf("replay one failed: %v", err)
	}
	if len(alertsRunOne) != 2 { // suppression should drop the duplicate
		t.Fatalf("expected 2 drift alerts, got %d", len(alertsRunOne))
	}

	// Reset file pointer and replay again on a fresh engine.
	if _, err := f.Seek(0, 0); err != nil {
		t.Fatalf("rewind: %v", err)
	}
	eng2 := seedEngine()
	alertsRunTwo, err := eng2.ReplayFromReader(ctx, f)
	if err != nil {
		t.Fatalf("replay two failed: %v", err)
	}

	if len(alertsRunTwo) != len(alertsRunOne) {
		t.Fatalf("expected deterministic alert count")
	}
	for i := range alertsRunOne {
		if alertsRunOne[i].Event.ID != alertsRunTwo[i].Event.ID {
			t.Fatalf("alert mismatch at %d: %s vs %s", i, alertsRunOne[i].Event.ID, alertsRunTwo[i].Event.ID)
		}
		if alertsRunOne[i].Verdict.Reason != alertsRunTwo[i].Verdict.Reason {
			t.Fatalf("reason mismatch at %d", i)
		}
	}
}

func TestReplayOnCleanStreamMeetsTarget(t *testing.T) {
	eng := seedEngine()
	cleanPath := filepath.Join("..", "..", "testdata", "clean.ndjson")
	f, err := os.Open(cleanPath)
	if err != nil {
		t.Fatalf("open clean fixture: %v", err)
	}
	defer f.Close()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	alerts, err := eng.ReplayFromReader(ctx, f)
	if err != nil {
		t.Fatalf("replay clean failed: %v", err)
	}
	if len(alerts) != 0 {
		t.Fatalf("expected no alerts on clean stream")
	}
	if rate := eng.FalsePositiveRate(); rate > 0.01 {
		t.Fatalf("false positive rate %f exceeded target", rate)
	}
}
