package verifier

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/summit/psb/internal/model"
)

func TestVerifySuccess(t *testing.T) {
	dataset := loadDataset(t, "../../data/sample_dataset.json")
	cert := loadCertificate(t, "../../fixtures/certificate.json")
	result, err := Verify(cert, dataset)
	if err != nil {
		t.Fatalf("expected certificate to verify: %v", err)
	}
	expectedSamples := loadSamples(t, "../../fixtures/sample.json")
	if len(result.Samples) != len(expectedSamples) {
		t.Fatalf("unexpected sample map size: got %d want %d", len(result.Samples), len(expectedSamples))
	}
	for name, records := range expectedSamples {
		got := result.Samples[name]
		if len(got) != len(records) {
			t.Fatalf("stratum %s size mismatch: got %d want %d", name, len(got), len(records))
		}
		for i := range got {
			if got[i].ID != records[i].ID {
				t.Fatalf("stratum %s id mismatch at %d: got %s want %s", name, i, got[i].ID, records[i].ID)
			}
		}
	}
}

func TestVerifyRejectsAlteredSamples(t *testing.T) {
	dataset := loadDataset(t, "../../data/sample_dataset.json")
	cert := loadCertificate(t, "../../fixtures/certificate.json")
	cert.Strata[0].SampledIDs[0] = "rec-006"
	if _, err := Verify(cert, dataset); err == nil {
		t.Fatalf("expected verification failure when sampled ids are tampered")
	}
}

func TestVerifyRejectsInvalidProof(t *testing.T) {
	dataset := loadDataset(t, "../../data/sample_dataset.json")
	cert := loadCertificate(t, "../../fixtures/certificate.json")
	cert.Strata[0].SeedProof = "ff"
	if _, err := Verify(cert, dataset); err == nil {
		t.Fatalf("expected verification failure when seed proof is invalid")
	}
}

func loadDataset(t *testing.T, path string) model.Dataset {
	t.Helper()
	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open dataset: %v", err)
	}
	defer f.Close()
	var dataset model.Dataset
	if err := json.NewDecoder(f).Decode(&dataset); err != nil {
		t.Fatalf("decode dataset: %v", err)
	}
	return dataset
}

func loadCertificate(t *testing.T, path string) model.SamplingCertificate {
	t.Helper()
	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open certificate: %v", err)
	}
	defer f.Close()
	var cert model.SamplingCertificate
	if err := json.NewDecoder(f).Decode(&cert); err != nil {
		t.Fatalf("decode certificate: %v", err)
	}
	return cert
}

func loadSamples(t *testing.T, path string) map[string][]model.Record {
	t.Helper()
	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open samples: %v", err)
	}
	defer f.Close()
	var samples map[string][]model.Record
	if err := json.NewDecoder(f).Decode(&samples); err != nil {
		t.Fatalf("decode samples: %v", err)
	}
	return samples
}
