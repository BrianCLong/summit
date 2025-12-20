package sarif_test

import (
	"encoding/json"
	"testing"

	"github.com/summit/sss/pkg/models"
	"github.com/summit/sss/pkg/sarif"
)

func TestSarifDeterministic(t *testing.T) {
	findings := []models.Finding{
		{
			ID:          models.HashID("file", "rule", "value"),
			Detector:    "regex",
			RuleID:      "github-token",
			Description: "Pattern match",
			FilePath:    "file.txt",
			Line:        10,
			Column:      3,
			SecretType:  "github-token",
			Match:       "ghp_example",
			Severity:    models.SeverityHigh,
		},
	}
	reportA := sarif.FromFindings("test", findings)
	reportB := sarif.FromFindings("test", findings)

	a, err := json.Marshal(reportA)
	if err != nil {
		t.Fatalf("marshal A: %v", err)
	}
	b, err := json.Marshal(reportB)
	if err != nil {
		t.Fatalf("marshal B: %v", err)
	}
	if string(a) != string(b) {
		t.Fatalf("expected deterministic SARIF output")
	}
}
