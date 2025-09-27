package alsp

import (
	"bytes"
	"context"
	"testing"
	"time"
)

func TestProverVerifierAndReplay(t *testing.T) {
	ctx := context.Background()
	storage := NewInMemoryStorage()
	prover, err := NewProver(ctx, storage, 2)
	if err != nil {
		t.Fatalf("unexpected error creating prover: %v", err)
	}

	// Populate two blocks with a deliberate index gap between them.
	payload := bytes.Repeat([]byte("A"), 512)
	for i := 0; i < 2; i++ {
		_, err := prover.AppendEvent(ctx, time.Unix(0, int64(i)*int64(time.Millisecond)), payload)
		if err != nil {
			t.Fatalf("append event failed: %v", err)
		}
	}

	// Create a gap before appending the next block.
	prover.nextEventIndex = 5

	for i := 0; i < 2; i++ {
		_, err := prover.AppendEvent(ctx, time.Unix(0, int64(10+i)*int64(time.Millisecond)), payload)
		if err != nil {
			t.Fatalf("append event failed: %v", err)
		}
	}

	if err := prover.Flush(ctx); err != nil {
		t.Fatalf("flush failed: %v", err)
	}

	// Deterministic timing for proofs.
	prover.clock = &fakeClock{
		times: []time.Time{
			time.Unix(0, 0), time.Unix(0, 1_000), // range
			time.Unix(0, 2_000), time.Unix(0, 3_000), // event
			time.Unix(0, 4_000), time.Unix(0, 5_000), // gap
		},
	}

	rangeProof, err := prover.ProveRange(ctx, Range{Start: 0, End: 1})
	if err != nil {
		t.Fatalf("prove range failed: %v", err)
	}
	eventProof, err := prover.ProveEvent(ctx, 5)
	if err != nil {
		t.Fatalf("prove event failed: %v", err)
	}
	gapProof, err := prover.ProveGap(ctx, 2, 4)
	if err != nil {
		t.Fatalf("prove gap failed: %v", err)
	}

	verifier := NewVerifier(rangeProof.HeadDigest)
	rangeResult, err := verifier.VerifyRange(rangeProof)
	if err != nil {
		t.Fatalf("verify range failed: %v", err)
	}
	if rangeResult.CoveredRange != (Range{Start: 0, End: 1}) {
		t.Fatalf("unexpected range result: %+v", rangeResult.CoveredRange)
	}

	eventResult, err := verifier.VerifyEvent(eventProof)
	if err != nil {
		t.Fatalf("verify event failed: %v", err)
	}
	if eventResult.CoveredRange != (Range{Start: 5, End: 5}) {
		t.Fatalf("unexpected event result: %+v", eventResult.CoveredRange)
	}

	gapResult, err := verifier.VerifyGap(gapProof)
	if err != nil {
		t.Fatalf("verify gap failed: %v", err)
	}
	if gapResult.CoveredRange != (Range{Start: 2, End: 4}) {
		t.Fatalf("unexpected gap result: %+v", gapResult.CoveredRange)
	}

	replayer := NewReplayer(NewVerifier(rangeProof.HeadDigest))
	outcomes, err := replayer.Replay([]ReplayEntry{
		{RangeProof: &rangeProof},
		{EventProof: &eventProof},
		{GapProof: &gapProof},
	})
	if err != nil {
		t.Fatalf("replay failed: %v", err)
	}
	if len(outcomes) != 3 {
		t.Fatalf("unexpected replay outcomes: %d", len(outcomes))
	}
	for i, outcome := range outcomes {
		if outcome.Err != nil {
			t.Fatalf("outcome %d error: %v", i, outcome.Err)
		}
	}

	report := prover.Metrics()
	if report.CompressionRatio <= 1.0 {
		t.Fatalf("expected compression ratio > 1, got %f", report.CompressionRatio)
	}
	if report.AvgRangeLatency != time.Microsecond {
		t.Fatalf("unexpected range latency: %s", report.AvgRangeLatency)
	}
	if report.AvgEventLatency != time.Microsecond {
		t.Fatalf("unexpected event latency: %s", report.AvgEventLatency)
	}
	if report.AvgGapLatency != time.Microsecond {
		t.Fatalf("unexpected gap latency: %s", report.AvgGapLatency)
	}
}
