package orchestrator

import (
	"testing"
	"time"
)

func sampleRequest() NormalizedRequest {
	base := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	records := []Record{
		{ID: "a", OccurredAt: base.Add(10 * time.Minute), Jurisdiction: "US", ConsentGranted: true, RetentionExpiresAt: base.Add(240 * time.Hour)},
		{ID: "b", OccurredAt: base.Add(70 * time.Minute), Jurisdiction: "US", ConsentGranted: true, RetentionExpiresAt: base.Add(240 * time.Hour)},
		{ID: "c", OccurredAt: base.Add(130 * time.Minute), Jurisdiction: "CA", ConsentGranted: false, RetentionExpiresAt: base.Add(240 * time.Hour)},
		{ID: "d", OccurredAt: base.Add(190 * time.Minute), Jurisdiction: "US", ConsentGranted: true, RetentionExpiresAt: base.Add(-1 * time.Hour)},
	}
	return NormalizedRequest{
		RunID:     "run-123",
		Dataset:   "events",
		Start:     base,
		End:       base.Add(4 * time.Hour),
		ChunkSize: time.Hour,
		Policies: NormalizedPolicy{
			RequireConsent: true,
			AllowedJurisdictions: map[string]struct{}{
				"US": {},
			},
			RetentionCutoff: base,
		},
		SourceRecords: records,
		ExistingTargetIDs: map[string]struct{}{
			"b": {},
		},
		Metadata: map[string]any{"initiator": "test"},
	}
}

func TestPlanDeterministic(t *testing.T) {
	engine := NewEngine()
	req := sampleRequest()
	plan := engine.Plan(req)
	plan2 := engine.Plan(req)
	if len(plan) != len(plan2) {
		t.Fatalf("plan lengths mismatch: %d vs %d", len(plan), len(plan2))
	}
	for i := range plan {
		if plan[i] != plan2[i] {
			t.Fatalf("plan entries differ at %d: %+v vs %+v", i, plan[i], plan2[i])
		}
	}
}

func TestDryRunMatchesExecuteAdds(t *testing.T) {
	engine := NewEngine()
	req := sampleRequest()
	dryRun := engine.DryRun(req)
	exec := engine.Execute(req)
	for i, chunk := range dryRun.Chunks {
		if chunk.Partition != exec.Plan[i] {
			t.Fatalf("plan mismatch: %+v vs %+v", chunk.Partition, exec.Plan[i])
		}
		if len(chunk.Adds) != exec.Report.Partitions[i].AppliedRecords {
			t.Fatalf("chunk %d adds mismatch: %d vs %d", i, len(chunk.Adds), exec.Report.Partitions[i].AppliedRecords)
		}
	}
}

func TestPolicyViolationsBlockExecution(t *testing.T) {
	engine := NewEngine()
	req := sampleRequest()
	result := engine.Execute(req)
	blocked := 0
	for _, p := range result.Report.Partitions {
		if p.Status == "blocked" {
			blocked++
			if len(p.PolicyViolations) == 0 {
				t.Fatalf("blocked partition missing policy violations")
			}
		}
	}
	if blocked == 0 {
		t.Fatalf("expected at least one blocked partition")
	}
	if len(result.Report.PolicyViolations) == 0 {
		t.Fatalf("expected report level policy violations")
	}
}

func TestMerkleProofRoundTrip(t *testing.T) {
	ids := []string{"z", "a", "m"}
	root := ComputeMerkleRoot(ids)
	if root == "" {
		t.Fatalf("expected non-empty root")
	}
	if !VerifyMerkleRoot(ids, root) {
		t.Fatalf("verification failed")
	}
}
