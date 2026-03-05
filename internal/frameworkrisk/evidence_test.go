package frameworkrisk

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestGenerateEvidence(t *testing.T) {
	dir, err := os.MkdirTemp("", "test-generate-evidence")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(dir) // clean up

	report := EvaluateNextJSRisk()

	err = GenerateEvidence(report, dir)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	// Verify metrics.json
	metricsPath := filepath.Join(dir, "metrics.json")
	if _, err := os.Stat(metricsPath); os.IsNotExist(err) {
		t.Errorf("Expected metrics.json to be created")
	}

	// Verify stamp.json
	stampPath := filepath.Join(dir, "stamp.json")
	if _, err := os.Stat(stampPath); os.IsNotExist(err) {
		t.Errorf("Expected stamp.json to be created")
	}

	// Parse stamp.json to verify determinism logic
	stampData, err := os.ReadFile(stampPath)
	if err != nil {
		t.Fatalf("Failed to read stamp.json: %v", err)
	}

	var stamp map[string]interface{}
	if err := json.Unmarshal(stampData, &stamp); err != nil {
		t.Fatalf("Failed to parse stamp.json: %v", err)
	}

	if stamp["type"] != "framework_governance_risk" {
		t.Errorf("Expected stamp type 'framework_governance_risk', got %v", stamp["type"])
	}

	// Verify report.json
	reportPath := filepath.Join(dir, "report.json")
	if _, err := os.Stat(reportPath); os.IsNotExist(err) {
		t.Errorf("Expected report.json to be created")
	}
}
