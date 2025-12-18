package cache

import (
	"testing"
	"time"

	"github.com/summit/addn/pkg/addn"
)

func TestEdgeCacheManifestLifecycle(t *testing.T) {
	edge, err := NewEdgeCache(2*time.Minute, time.Minute)
	if err != nil {
		t.Fatalf("new edge cache: %v", err)
	}

	now := time.Now().UTC()
	_, err = edge.AddDataset(DatasetInput{
		Dataset:       "features",
		Version:       "2024-10-01",
		PolicyTags:    []string{"p0", "confidential"},
		ResidencyPins: []string{"us-east"},
		Artifacts: []ArtifactInput{{
			Name:       "features.json",
			Content:    []byte(`{"a":1}`),
			PolicyTags: []string{"row-level"},
			Residency:  "us-east",
		}},
	}, now)
	if err != nil {
		t.Fatalf("add dataset: %v", err)
	}

	resp, err := edge.GetManifest("features", "2024-10-01", now)
	if err != nil {
		t.Fatalf("get manifest: %v", err)
	}
	if resp.Status != "fresh" {
		t.Fatalf("expected fresh status, got %s", resp.Status)
	}

	if err := addn.VerifyManifest(resp, now, "us-east"); err != nil {
		t.Fatalf("verify manifest: %v", err)
	}

	respAgain, err := edge.GetManifest("features", "2024-10-01", now.Add(30*time.Second))
	if err != nil {
		t.Fatalf("get manifest again: %v", err)
	}
	if respAgain.Manifest.ManifestDigest != resp.Manifest.ManifestDigest {
		t.Fatalf("manifest digests changed for identical manifest")
	}
}

func TestEdgeCacheResidencyAndRevocation(t *testing.T) {
	edge, err := NewEdgeCache(time.Minute, time.Minute)
	if err != nil {
		t.Fatalf("new edge cache: %v", err)
	}

	now := time.Now()
	manifest, err := edge.AddDataset(DatasetInput{
		Dataset:       "dataset",
		Version:       "v1",
		PolicyTags:    []string{"pii"},
		ResidencyPins: []string{"eu-central"},
		Artifacts: []ArtifactInput{{
			Name:      "data.bin",
			Content:   []byte{1, 2, 3},
			Residency: "eu-central",
		}},
	}, now)
	if err != nil {
		t.Fatalf("add dataset: %v", err)
	}

	if _, err := edge.GetArtifact("dataset", "v1", "data.bin", "us-east"); err == nil {
		t.Fatalf("expected residency violation")
	}

	resp, err := edge.GetManifest("dataset", "v1", now)
	if err != nil {
		t.Fatalf("manifest fetch: %v", err)
	}

	edge.RevokeArtifact(manifest.Artifacts[0].Digest, "compromised", now.Add(time.Second))
	if _, err := edge.GetArtifact("dataset", "v1", "data.bin", "eu-central"); err == nil {
		t.Fatalf("expected revoked artifact error")
	}

	edge.RevokeManifest(manifest.ManifestDigest, "stale", now.Add(2*time.Second))
	if _, err := edge.GetManifest("dataset", "v1", now.Add(3*time.Second)); err == nil {
		t.Fatalf("expected revoked manifest error")
	}

	if err := addn.VerifyManifest(resp, now, "eu-central"); err != nil {
		t.Fatalf("verify manifest pre-revocation should succeed: %v", err)
	}
}

func TestEdgeCacheStaleWhileRevalidate(t *testing.T) {
	edge, err := NewEdgeCache(2*time.Second, 4*time.Second)
	if err != nil {
		t.Fatalf("new edge cache: %v", err)
	}

	now := time.Now()
	_, err = edge.AddDataset(DatasetInput{
		Dataset:       "signals",
		Version:       "001",
		ResidencyPins: []string{"ap-south"},
		Artifacts: []ArtifactInput{{
			Name:      "signals.json",
			Content:   []byte(`[]`),
			Residency: "ap-south",
		}},
	}, now)
	if err != nil {
		t.Fatalf("add dataset: %v", err)
	}

	resp, err := edge.GetManifest("signals", "001", now.Add(3*time.Second))
	if err != nil {
		t.Fatalf("expected stale manifest within SWR window: %v", err)
	}
	if resp.Status != "stale" {
		t.Fatalf("expected stale status, got %s", resp.Status)
	}

	if _, err := edge.GetManifest("signals", "001", now.Add(7*time.Second)); err == nil {
		t.Fatalf("expected manifest expiration beyond SWR window")
	}
}
