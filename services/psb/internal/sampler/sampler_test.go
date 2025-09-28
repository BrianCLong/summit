package sampler

import (
	"crypto/ed25519"
	"encoding/json"
	"os"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/summit/psb/internal/files"
	"github.com/summit/psb/internal/model"
)

func TestSamplerDeterministicReplay(t *testing.T) {
	dataset := loadDataset(t, "../../data/sample_dataset.json")
	priv := loadPrivateKey(t, "../../fixtures/vrf_private_key.hex")
	samplerSvc, err := New(dataset, priv)
	if err != nil {
		t.Fatalf("failed to create sampler: %v", err)
	}
	fixedTime := time.Date(2025, 9, 27, 7, 25, 13, 154913374, time.UTC)
	samplerSvc.WithClock(func() time.Time { return fixedTime })

	req := loadRequest(t, "../../fixtures/request.json")
	resp, err := samplerSvc.Sample(req)
	if err != nil {
		t.Fatalf("sample failed: %v", err)
	}

	expectedSamples := loadSamples(t, "../../fixtures/sample.json")
	if !reflect.DeepEqual(expectedSamples, resp.Samples) {
		t.Fatalf("samples mismatch\nexpected: %v\nactual: %v", expectedSamples, resp.Samples)
	}

	expectedCert := loadCertificate(t, "../../fixtures/certificate.json")
	resp.Certificate.GeneratedAt = resp.Certificate.GeneratedAt.UTC()
	if !reflect.DeepEqual(expectedCert, resp.Certificate) {
		t.Fatalf("certificate mismatch\nexpected: %+v\nactual: %+v", expectedCert, resp.Certificate)
	}
}

func TestSamplerRequestValidation(t *testing.T) {
	dataset := loadDataset(t, "../../data/sample_dataset.json")
	priv := loadPrivateKey(t, "../../fixtures/vrf_private_key.hex")
	samplerSvc, err := New(dataset, priv)
	if err != nil {
		t.Fatalf("failed to create sampler: %v", err)
	}

	base := loadRequest(t, "../../fixtures/request.json")

	cases := []struct {
		name    string
		prepare func(model.SamplingRequest) model.SamplingRequest
		wantErr string
	}{
		{
			name: "missing partner",
			prepare: func(req model.SamplingRequest) model.SamplingRequest {
				req.PartnerID = ""
				return req
			},
			wantErr: "partner_id is required",
		},
		{
			name: "missing seed",
			prepare: func(req model.SamplingRequest) model.SamplingRequest {
				req.Seed = ""
				return req
			},
			wantErr: "seed is required",
		},
		{
			name: "no strata",
			prepare: func(req model.SamplingRequest) model.SamplingRequest {
				req.Strata = nil
				return req
			},
			wantErr: "at least one stratum",
		},
		{
			name: "empty stratum name",
			prepare: func(req model.SamplingRequest) model.SamplingRequest {
				req.Strata[0].Name = ""
				return req
			},
			wantErr: "strata name is required",
		},
		{
			name: "duplicate stratum name",
			prepare: func(req model.SamplingRequest) model.SamplingRequest {
				req.Strata = append(req.Strata, req.Strata[0])
				return req
			},
			wantErr: "duplicate stratum name",
		},
		{
			name: "non-positive target",
			prepare: func(req model.SamplingRequest) model.SamplingRequest {
				req.Strata[0].Target = 0
				return req
			},
			wantErr: "target must be positive",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := cloneRequest(base)
			req = tc.prepare(req)
			if _, err := samplerSvc.Sample(req); err == nil || !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("expected error containing %q, got %v", tc.wantErr, err)
			}
		})
	}
}

func TestSamplerRespectsExclusionsAndUniqueness(t *testing.T) {
	dataset := loadDataset(t, "../../data/sample_dataset.json")
	priv := loadPrivateKey(t, "../../fixtures/vrf_private_key.hex")
	samplerSvc, err := New(dataset, priv)
	if err != nil {
		t.Fatalf("failed to create sampler: %v", err)
	}

	req := cloneRequest(loadRequest(t, "../../fixtures/request.json"))
	req.Strata = append(req.Strata, model.StratumRequest{
		Name:   "us-backfill",
		Target: 1,
		Geo:    []string{"US"},
	})

	resp, err := samplerSvc.Sample(req)
	if err != nil {
		t.Fatalf("sample failed: %v", err)
	}

	seen := make(map[string]struct{})
	for stratum, records := range resp.Samples {
		for _, rec := range records {
			if rec.ID == "rec-002" {
				t.Fatalf("stratum %s included excluded record rec-002", stratum)
			}
			if _, dup := seen[rec.ID]; dup {
				t.Fatalf("record %s appeared in multiple strata", rec.ID)
			}
			seen[rec.ID] = struct{}{}
		}
	}

	if records := resp.Samples["us-backfill"]; len(records) != 0 {
		t.Fatalf("expected us-backfill to be empty due to prior selection, got %d", len(records))
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

func loadRequest(t *testing.T, path string) model.SamplingRequest {
	t.Helper()
	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open request: %v", err)
	}
	defer f.Close()
	var req model.SamplingRequest
	if err := json.NewDecoder(f).Decode(&req); err != nil {
		t.Fatalf("decode request: %v", err)
	}
	return req
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

func loadPrivateKey(t *testing.T, path string) ed25519.PrivateKey {
	t.Helper()
	priv, err := files.LoadPrivateKey(path)
	if err != nil {
		t.Fatalf("load private key: %v", err)
	}
	return priv
}

func cloneRequest(req model.SamplingRequest) model.SamplingRequest {
	cloned := req
	cloned.Strata = append([]model.StratumRequest(nil), req.Strata...)
	cloned.Exclusions = append([]string(nil), req.Exclusions...)
	return cloned
}
