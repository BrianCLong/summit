package broker_test

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"strings"
	"testing"
	"time"

	"github.com/summit-platform/csdb/internal/broker"
	"github.com/summit-platform/csdb/internal/data"
)

func setupBroker(t *testing.T) *broker.Broker {
	t.Helper()
	b, err := broker.NewBroker(data.ExportFixtures, data.PartnerFixtures)
	if err != nil {
		t.Fatalf("failed to set up broker: %v", err)
	}
	return b
}

func TestCreateExportAppliesConsentAndJurisdictionFilters(t *testing.T) {
	b := setupBroker(t)

	res, err := b.CreateExport(context.Background(), broker.ExportRequest{
		PartnerID:    "partner-alpha",
		Purpose:      "marketing",
		Jurisdiction: "US",
	})
	if err != nil {
		t.Fatalf("CreateExport returned error: %v", err)
	}

	if res.Preview {
		t.Fatalf("expected live export, got preview")
	}
	if len(res.Records) != 1 {
		t.Fatalf("expected 1 record after consent and jurisdiction filtering, got %d", len(res.Records))
	}
	if res.Records[0].ID != "rec-001" {
		t.Fatalf("expected record rec-001, got %s", res.Records[0].ID)
	}

	manifest := res.Manifest
	if manifest.Filters.Purpose != "marketing" {
		t.Fatalf("unexpected manifest purpose: %s", manifest.Filters.Purpose)
	}
	if manifest.Filters.Jurisdiction != "US" {
		t.Fatalf("unexpected manifest jurisdiction: %s", manifest.Filters.Jurisdiction)
	}

	partner := data.PartnerFixtures[0]
	ok, err := broker.VerifyManifest(manifest, partner.ManifestPublicKey)
	if err != nil {
		t.Fatalf("VerifyManifest returned error: %v", err)
	}
	if !ok {
		t.Fatalf("expected manifest signature to verify")
	}

	stored, found := b.GetManifest(manifest.ID)
	if !found {
		t.Fatalf("expected manifest to be stored")
	}
	if stored.ID != manifest.ID {
		t.Fatalf("stored manifest mismatch")
	}
}

func TestPreviewDoesNotPersistManifest(t *testing.T) {
	b := setupBroker(t)
	res, err := b.PreviewExport(context.Background(), broker.ExportRequest{
		PartnerID: "partner-alpha",
		Purpose:   "marketing",
	})
	if err != nil {
		t.Fatalf("PreviewExport error: %v", err)
	}
	if !res.Preview {
		t.Fatalf("expected preview flag to be set")
	}
	if _, found := b.GetManifest(res.Manifest.ID); found {
		t.Fatalf("dry-run manifest should not be persisted")
	}
}

func TestAttestationValidationDeterministic(t *testing.T) {
	b := setupBroker(t)
	partner := data.PartnerFixtures[0]

	att := broker.Attestation{
		PartnerID: "partner-alpha",
		Statement: "dataset-received",
		Timestamp: time.Date(2025, 1, 15, 12, 0, 0, 0, time.UTC),
		Nonce:     "abc123",
	}
	payload := []byte(strings.Join([]string{
		att.PartnerID,
		att.Statement,
		att.Timestamp.UTC().Format(time.RFC3339Nano),
		att.Nonce,
	}, "|"))
	sig := ed25519.Sign(ed25519.PrivateKey(partner.AttestationPrivateKey), payload)
	att.Signature = base64.StdEncoding.EncodeToString(sig)

	result := b.ValidateAttestation(att)
	if !result.Valid {
		t.Fatalf("expected attestation to verify, got reason: %s", result.Reason)
	}

	att.Signature = base64.StdEncoding.EncodeToString(sig[:len(sig)-1])
	result = b.ValidateAttestation(att)
	if result.Valid {
		t.Fatalf("expected attestation tampering to be detected")
	}
}
