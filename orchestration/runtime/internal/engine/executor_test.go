package engine

import (
	"context"
	"testing"
	"time"

	"github.com/summit/orchestration/runtime/internal/model"
	"github.com/summit/orchestration/runtime/internal/state"
)

func TestExecutorRunsWorkflow(t *testing.T) {
	store := state.NewInMemoryStore()
	exec := NewExecutor(store)

	ir := model.IRDag{
		Name:      "demo",
		Namespace: "tests",
		Nodes: []model.Node{
			{ID: "first", Uses: "http.get"},
			{ID: "second", Uses: "kafka.publish"},
		},
		Edges:    []model.Edge{{From: "first", To: "second"}},
		SpecHash: "abc123",
	}
	ir.Retry.MaxAttempts = 3
	ir.Retry.BaseMs = 10

	runID, err := exec.Start(context.Background(), model.StartRequest{IR: ir, Actor: "tester"})
	if err != nil {
		t.Fatalf("start: %v", err)
	}

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		status, err := exec.Status(context.Background(), runID)
		if err != nil {
			t.Fatalf("status: %v", err)
		}
		if status.State == "Succeeded" {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("workflow did not succeed in time")
}

func TestTopoSortDetectsCycle(t *testing.T) {
	_, err := topoSort(map[string][]string{
		"a": []string{"b"},
		"b": []string{"a"},
	})
	if err == nil {
		t.Fatalf("expected cycle error")
	}
}
