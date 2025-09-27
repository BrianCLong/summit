package service

import (
	"context"
	"testing"
	"time"

	"example.com/summit/fcs/internal/model"
	"example.com/summit/fcs/internal/provenance"
	"example.com/summit/fcs/internal/store"
)

func newPipeline(t *testing.T) *Pipeline {
	t.Helper()
	provManager, err := provenance.NewRandomManager()
	if err != nil {
		t.Fatalf("failed to create provenance manager: %v", err)
	}
	stores := map[model.StoreKind]store.Store{
		model.StoreDatabase: store.NewMemoryStore(model.StoreDatabase),
		model.StoreObject:   store.NewMemoryStore(model.StoreObject),
		model.StoreSearch:   store.NewMemoryStore(model.StoreSearch),
		model.StoreVector:   store.NewMemoryStore(model.StoreVector),
	}
	pipeline, err := NewPipeline(stores, provManager)
	if err != nil {
		t.Fatalf("failed to create pipeline: %v", err)
	}
	return pipeline
}

func TestSeedAndScan(t *testing.T) {
	pipeline := newPipeline(t)

	spec := model.CanarySpec{
		Scope:      "finance.payables",
		TTLSeconds: 3600,
		Payload: map[string]any{
			"account": "CANARY-123",
			"value":   42,
		},
		Stores: []model.StoreKind{model.StoreDatabase, model.StoreObject},
	}

	record, err := pipeline.Seed(context.Background(), spec)
	if err != nil {
		t.Fatalf("seed failed: %v", err)
	}

	if record.ID == "" {
		t.Fatalf("expected record ID to be generated")
	}

	if !pipeline.VerifyProvenance(record.Provenance) {
		t.Fatalf("provenance signature failed verification")
	}

	detections, err := pipeline.Scan(context.Background())
	if err != nil {
		t.Fatalf("pipeline scan failed: %v", err)
	}
	if len(detections) != 2 {
		t.Fatalf("expected 2 detections, got %d", len(detections))
	}
	for _, detection := range detections {
		if detection.CanaryID != record.ID {
			t.Fatalf("unexpected canary id %s", detection.CanaryID)
		}
		if detection.Confidence < 0.5 || detection.Confidence > 0.99 {
			t.Fatalf("confidence outside expected range: %f", detection.Confidence)
		}
	}
}

func TestBuildAttributionReport(t *testing.T) {
	pipeline := newPipeline(t)

	spec := model.CanarySpec{
		Scope:      "research.biotech",
		TTLSeconds: 120,
		Payload: map[string]any{
			"docId": "HX-99",
		},
		Stores: []model.StoreKind{model.StoreSearch, model.StoreVector, model.StoreObject},
	}

	record, err := pipeline.Seed(context.Background(), spec)
	if err != nil {
		t.Fatalf("seed failed: %v", err)
	}

	report, err := pipeline.BuildAttributionReport(context.Background())
	if err != nil {
		t.Fatalf("report generation failed: %v", err)
	}

	if len(report.Findings) != 1 {
		t.Fatalf("expected one finding, got %d", len(report.Findings))
	}

	finding := report.Findings[0]
	if finding.CanaryID != record.ID {
		t.Fatalf("unexpected canary id %s", finding.CanaryID)
	}
	if len(finding.Stores) != 3 {
		t.Fatalf("expected three stores, got %d", len(finding.Stores))
	}
	if finding.Scope != spec.Scope {
		t.Fatalf("expected scope %s got %s", spec.Scope, finding.Scope)
	}
	if finding.Confidence < 0.9 {
		t.Fatalf("expected high confidence, got %f", finding.Confidence)
	}
	if finding.Provenance.CanaryID != record.ID {
		t.Fatalf("finding provenance mismatch")
	}
	if finding.Provenance.ExpiresAt.Before(time.Now().UTC()) {
		t.Fatalf("provenance indicates expired canary unexpectedly")
	}
}

func TestSeedNormalisesSpec(t *testing.T) {
	pipeline := newPipeline(t)

	spec := model.CanarySpec{
		Scope:      "ops.data-loss",
		TTLSeconds: 1800,
		Payload: map[string]any{
			"account": "A-100",
		},
		Metadata: map[string]any{
			"owner": "purple-team",
		},
		Stores: []model.StoreKind{model.StoreObject, model.StoreDatabase},
	}

	record, err := pipeline.Seed(context.Background(), spec)
	if err != nil {
		t.Fatalf("seed failed: %v", err)
	}

	// Mutate original spec after seeding; stored record should remain stable.
	spec.Payload["account"] = "tampered"
	spec.Metadata["owner"] = "red-team"
	spec.Stores[0] = model.StoreVector

	if record.Spec.Payload["account"] != "A-100" {
		t.Fatalf("expected payload to be copied, got %v", record.Spec.Payload["account"])
	}
	if record.Spec.Metadata["owner"] != "purple-team" {
		t.Fatalf("expected metadata to be copied, got %v", record.Spec.Metadata["owner"])
	}
	if len(record.Spec.Stores) != 2 {
		t.Fatalf("expected two stores, got %d", len(record.Spec.Stores))
	}
	if record.Spec.Stores[0] != model.StoreDatabase || record.Spec.Stores[1] != model.StoreObject {
		t.Fatalf("expected stores to be sorted and copied, got %v", record.Spec.Stores)
	}
}

func TestSeedRejectsDuplicateStores(t *testing.T) {
	pipeline := newPipeline(t)

	spec := model.CanarySpec{
		Scope:      "ops.duplicate",
		TTLSeconds: 600,
		Stores: []model.StoreKind{
			model.StoreDatabase,
			model.StoreDatabase,
		},
	}

	if _, err := pipeline.Seed(context.Background(), spec); err == nil {
		t.Fatalf("expected error for duplicate stores")
	}
}
