package krpcp

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func loadFixture(t *testing.T, name string) Fixture {
	t.Helper()
	path := filepath.Join("fixtures", name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read fixture %s: %v", name, err)
	}
	var fixture Fixture
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("failed to unmarshal fixture %s: %v", name, err)
	}
	return fixture
}

func TestBuildRotationPlanDeterministic(t *testing.T) {
	fixture := loadFixture(t, "sample_fixture.json")
	planA, err := BuildRotationPlan(fixture)
	if err != nil {
		t.Fatalf("BuildRotationPlan failed: %v", err)
	}
	planB, err := BuildRotationPlan(fixture)
	if err != nil {
		t.Fatalf("BuildRotationPlan second run failed: %v", err)
	}
	if !reflect.DeepEqual(planA, planB) {
		t.Fatalf("expected deterministic plan, got different results")
	}
}

func TestExecuteRotationPlanCoverage(t *testing.T) {
	fixture := loadFixture(t, "sample_fixture.json")
	plan, err := BuildRotationPlan(fixture)
	if err != nil {
		t.Fatalf("failed to build plan: %v", err)
	}
	receipt, err := ExecuteRotationPlan(plan, fixture)
	if err != nil {
		t.Fatalf("ExecuteRotationPlan failed: %v", err)
	}
	if len(receipt.Coverage.Assets) != len(fixture.Assets) {
		t.Fatalf("expected coverage for %d assets, got %d", len(fixture.Assets), len(receipt.Coverage.Assets))
	}
	if err := ValidateCoverageProof(receipt.Coverage); err != nil {
		t.Fatalf("coverage proof invalid: %v", err)
	}
}

func TestRepeatedRunReceiptDeterminism(t *testing.T) {
	fixture := loadFixture(t, "sample_fixture.json")
	plan, err := BuildRotationPlan(fixture)
	if err != nil {
		t.Fatalf("failed to build plan: %v", err)
	}
	receiptA, err := ExecuteRotationPlan(plan, fixture)
	if err != nil {
		t.Fatalf("ExecuteRotationPlan run A failed: %v", err)
	}
	receiptB, err := ExecuteRotationPlan(plan, fixture)
	if err != nil {
		t.Fatalf("ExecuteRotationPlan run B failed: %v", err)
	}
	if !reflect.DeepEqual(receiptA, receiptB) {
		t.Fatalf("expected deterministic receipts, got mismatched results")
	}
}
