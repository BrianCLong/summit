package scanner_test

import (
	"path/filepath"
	"testing"

	"github.com/summit/sss/pkg/detectors"
	"github.com/summit/sss/pkg/engine"
	"github.com/summit/sss/pkg/scanner"
)

func TestScannerDetectsSeededSecrets(t *testing.T) {
	e, err := engine.New(
		detectors.EntropyDetector{},
		detectors.RegexDetector{},
		detectors.ContextDetector{},
	)
	if err != nil {
		t.Fatalf("engine init: %v", err)
	}

	s := scanner.New(e)
	results, err := s.Scan(scanner.Options{Root: filepath.FromSlash("../../testdata/redteam")})
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(results) == 0 {
		t.Fatal("expected findings but got none")
	}

	required := map[string]bool{
		"aws-access-key":   false,
		"aws-secret-key":   false,
		"github-token":     false,
		"email":            false,
		"us-ssn":           false,
		"potential-secret": false,
	}
	for _, finding := range results {
		if _, ok := required[finding.SecretType]; ok {
			required[finding.SecretType] = true
		}
	}
	for rule, seen := range required {
		if !seen {
			t.Fatalf("expected to detect %s leak", rule)
		}
	}
}
