package service_test

import (
	"context"
	"testing"

	"github.com/summit/escp/internal/agents"
	"github.com/summit/escp/internal/backends"
	"github.com/summit/escp/internal/proof"
	"github.com/summit/escp/internal/service"
	"github.com/summit/escp/internal/sla"
)

func buildAgents() []agents.Agent {
	storage := backends.NewInMemoryBackend([]backends.Record{{Key: "obj:1", Subject: "user-123"}, {Key: "obj:2", Subject: "user-123"}})
	cache := backends.NewInMemoryBackend([]backends.Record{{Key: "cache:1", Subject: "user-123"}})
	feature := backends.NewInMemoryBackend([]backends.Record{{Key: "feat:1", Subject: "user-123"}})
	search := backends.NewInMemoryBackend([]backends.Record{{Key: "search:1", Subject: "user-123"}})

	var out []agents.Agent
	out = append(out, mustAgent(agents.New(agents.Config{System: "storage", Classification: "storage", Backend: storage})))
	out = append(out, mustAgent(agents.New(agents.Config{System: "cache", Classification: "cache", Backend: cache})))
	out = append(out, mustAgent(agents.New(agents.Config{System: "feature", Classification: "feature", Backend: feature})))
	out = append(out, mustAgent(agents.New(agents.Config{System: "search", Classification: "search", Backend: search})))
	return out
}

func mustAgent(agent agents.Agent, err error) agents.Agent {
	if err != nil {
		panic(err)
	}
	return agent
}

func TestDryRunMatchesExecution(t *testing.T) {
	tracker := sla.NewTracker()
	svc := service.New(buildAgents(), tracker)

	dry, err := svc.Process(context.Background(), service.Request{SubjectID: "user-123", DryRun: true})
	if err != nil {
		t.Fatalf("dry-run: %v", err)
	}
	if len(dry.DryRun) != 4 {
		t.Fatalf("expected 4 systems, got %d", len(dry.DryRun))
	}

	exec, err := svc.Process(context.Background(), service.Request{SubjectID: "user-123"})
	if err != nil {
		t.Fatalf("execute: %v", err)
	}

	for system, keys := range dry.DryRun {
		execKeys, ok := exec.DryRun[system]
		if !ok {
			t.Fatalf("execution missing system %s", system)
		}
		if len(execKeys) != len(keys) {
			t.Fatalf("key mismatch for %s", system)
		}
		for i := range keys {
			if execKeys[i] != keys[i] {
				t.Fatalf("key mismatch for %s", system)
			}
		}
	}

	if len(exec.Proofs) != 4 {
		t.Fatalf("expected 4 proofs, got %d", len(exec.Proofs))
	}
	for _, p := range exec.Proofs {
		if !p.Verify() {
			t.Fatalf("proof invalid for %s", p.System)
		}
	}

	report := exec.SLA
	if len(report) != 4 {
		t.Fatalf("expected SLA for 4 systems, got %d", len(report))
	}
	for system, metrics := range report {
		if metrics.Count == 0 {
			t.Fatalf("no metrics recorded for %s", system)
		}
	}
}

func TestNegativeProofsDeterministic(t *testing.T) {
	proofs, err := proof.BuildNegativeProofs([]string{"b", "a"})
	if err != nil {
		t.Fatalf("build proofs: %v", err)
	}
	if len(proofs) != 2 {
		t.Fatalf("expected 2 proofs")
	}
	if proofs[0].Key != "a" || proofs[1].Key != "b" {
		t.Fatalf("proofs not sorted")
	}
	if !proof.VerifyNegativeProofs(proofs) {
		t.Fatalf("proof verification failed")
	}
}
