package state

import (
	"context"
	"testing"

	"github.com/summit/orchestration/runtime/internal/model"
)

func TestInMemoryStoreLifecycle(t *testing.T) {
	store := NewInMemoryStore()
	ir := model.IRDag{Name: "demo", Namespace: "tests", SpecHash: "hash"}

	if err := store.BeginRun(context.Background(), "run1", "tester", map[string]string{"env": "test"}, ir, nil); err != nil {
		t.Fatalf("begin: %v", err)
	}

	if err := store.MarkCurrent(context.Background(), "run1", "nodeA"); err != nil {
		t.Fatalf("mark: %v", err)
	}

	if err := store.RecordNoop(context.Background(), "run1", model.Node{ID: "nodeA", Uses: "noop"}); err != nil {
		t.Fatalf("record: %v", err)
	}

	if err := store.Succeed(context.Background(), "run1"); err != nil {
		t.Fatalf("succeed: %v", err)
	}

	status, err := store.Status(context.Background(), "run1")
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	if status.State != "Succeeded" {
		t.Fatalf("unexpected state: %s", status.State)
	}

	events := store.Events("run1")
	if len(events) == 0 {
		t.Fatalf("expected events to be recorded")
	}
}

func TestFailPersistsMessage(t *testing.T) {
	store := NewInMemoryStore()
	ir := model.IRDag{Name: "demo", Namespace: "tests", SpecHash: "hash"}
	_ = store.BeginRun(context.Background(), "run2", "tester", nil, ir, nil)
	_ = store.Fail(context.Background(), "run2", "boom")
	status, err := store.Status(context.Background(), "run2")
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	if status.State != "Failed" || status.Current != "boom" {
		t.Fatalf("unexpected failure state: %#v", status)
	}
}

func TestOpenPostgresFallsBack(t *testing.T) {
	store, err := OpenPostgres(context.Background(), "")
	if err != nil {
		t.Fatalf("open postgres fallback: %v", err)
	}
	if store == nil {
		t.Fatalf("expected store instance")
	}
	_ = store.Close()
}

func TestEnsureSchemaError(t *testing.T) {
	store := &Store{}
	if err := store.ensureSchema(context.Background()); err != nil {
		t.Fatalf("ensure schema with nil db should succeed: %v", err)
	}
}

func TestTimestampOrdering(t *testing.T) {
	store := NewInMemoryStore()
	ir := model.IRDag{Name: "demo", Namespace: "tests", SpecHash: "hash"}
	_ = store.BeginRun(context.Background(), "run3", "tester", nil, ir, nil)
	_ = store.RecordNoop(context.Background(), "run3", model.Node{ID: "a", Uses: "noop"})
	events := store.Events("run3")
	if len(events) != 2 {
		t.Fatalf("expected two events, got %d", len(events))
	}
	if !events[0].Timestamp.Before(events[1].Timestamp) && !events[0].Timestamp.Equal(events[1].Timestamp) {
		t.Fatalf("timestamps not monotonic")
	}
}
