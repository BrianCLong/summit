package index_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"rcsi/internal/index"
)

func TestIndexSnapshotAndProofs(t *testing.T) {
	clockFactory := func() func() time.Time {
		base := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC)
		cursor := 0
		return func() time.Time {
			t := base.Add(time.Duration(cursor) * time.Hour)
			cursor++
			return t
		}
	}

	idx := index.New(index.WithClock(clockFactory()))

	docs := mustLoadDocuments(t, filepath.Join("..", "..", "fixtures", "corpus.json"))
	redactions := mustLoadRedactions(t, filepath.Join("..", "..", "fixtures", "redactions.json"))

	if err := idx.ApplyFixtures(docs, redactions); err != nil {
		t.Fatalf("apply fixtures: %v", err)
	}

	// Ensure selective reindex leaves the state stable and deterministic.
	idx.SelectiveReindex([]string{"doc-001", "doc-002"})

	report := idx.Reconcile()
	if len(report.StaleTokens) != 0 || len(report.StaleVectors) != 0 {
		t.Fatalf("expected no stale tokens/vectors, got %+v", report)
	}

	snapshot := idx.Snapshot()
	data, err := index.ExportSnapshot(snapshot)
	if err != nil {
		t.Fatalf("export snapshot: %v", err)
	}

	snapshotPath := filepath.Join("testdata", "index_snapshot.json")
	if os.Getenv("UPDATE_SNAPSHOT") == "1" {
		if err := os.WriteFile(snapshotPath, data, 0o644); err != nil {
			t.Fatalf("update snapshot: %v", err)
		}
	}

	expected, err := os.ReadFile(snapshotPath)
	if err != nil {
		t.Fatalf("read snapshot: %v", err)
	}

	if string(expected) != string(data) {
		t.Fatalf("snapshot mismatch\nexpected:%s\nactual:%s", expected, data)
	}

	docProof, err := idx.NegativeProofDocument("doc-003")
	if err != nil {
		t.Fatalf("document proof: %v", err)
	}
	if err := index.ValidateProof(docProof, snapshot); err != nil {
		t.Fatalf("validate document proof: %v", err)
	}

	termProof, err := idx.NegativeProofTerm("erasure", "doc-002")
	if err != nil {
		t.Fatalf("term proof: %v", err)
	}
	if err := index.ValidateProof(termProof, snapshot); err != nil {
		t.Fatalf("validate term proof: %v", err)
	}

	// Deterministic run check: rebuild from scratch and compare snapshots.
	idx2 := index.New(index.WithClock(clockFactory()))
	if err := idx2.ApplyFixtures(docs, redactions); err != nil {
		t.Fatalf("apply fixtures second run: %v", err)
	}
	idx2.SelectiveReindex([]string{"doc-001", "doc-002"})

	snapshot2 := idx2.Snapshot()
	data2, err := index.ExportSnapshot(snapshot2)
	if err != nil {
		t.Fatalf("export snapshot second run: %v", err)
	}
	if string(data) != string(data2) {
		t.Fatalf("snapshots diverged between runs")
	}

	// Proofs remain valid against independent snapshot.
	if err := index.ValidateProof(docProof, snapshot2); err != nil {
		t.Fatalf("validate doc proof on second snapshot: %v", err)
	}
	if err := index.ValidateProof(termProof, snapshot2); err != nil {
		t.Fatalf("validate term proof on second snapshot: %v", err)
	}
}

func mustLoadDocuments(t *testing.T, path string) []index.Document {
	t.Helper()
	if path == "" {
		return nil
	}
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read documents: %v", err)
	}
	var docs []index.Document
	if err := json.Unmarshal(content, &docs); err != nil {
		t.Fatalf("parse documents: %v", err)
	}
	return docs
}

func mustLoadRedactions(t *testing.T, path string) []index.RedactionEvent {
	t.Helper()
	if path == "" {
		return nil
	}
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read redactions: %v", err)
	}
	var events []index.RedactionEvent
	if err := json.Unmarshal(content, &events); err != nil {
		t.Fatalf("parse redactions: %v", err)
	}
	return events
}
