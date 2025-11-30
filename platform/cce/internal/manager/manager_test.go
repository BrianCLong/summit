package manager

import (
	"context"
	"encoding/base64"
	"testing"

	"platform/cce/api"
	"platform/cce/internal/attestation"
	"platform/cce/internal/storage"
)

func testManager(t *testing.T) *EnclaveManager {
	t.Helper()
	verifier := attestation.NewVerifier(
		"abc123",
		[]string{"us-east-1"},
		[]attestation.Quote{{ID: "q1", Region: "us-east-1", Measurement: "abc123"}},
	)
	key := []byte("0123456789abcdef0123456789abcdef0123456789abcdef")
	store, err := storage.NewSealedStorage(key)
	if err != nil {
		t.Fatalf("storage init: %v", err)
	}
	mgr, err := NewEnclaveManager(verifier, store, "kms-wrap", "us-east-1")
	if err != nil {
		t.Fatalf("manager init: %v", err)
	}
	return mgr
}

func TestRunJobHashesPayload(t *testing.T) {
	mgr := testManager(t)
	res, err := mgr.RunJob(context.Background(), &api.RunJobRequest{
		JobID:            "job-1",
		Payload:          "echo me",
		AttestationQuote: "attest:q1:us-east-1:abc123",
	})
	if err != nil {
		t.Fatalf("run job: %v", err)
	}
	if res.OutputHash == "" || res.SealedBlob == "" {
		t.Fatalf("expected output hash and sealed blob")
	}
	if _, err := base64.StdEncoding.DecodeString(res.SealedBlob); err != nil {
		t.Fatalf("sealed blob not base64: %v", err)
	}
}

func TestRunJobRejectsEgress(t *testing.T) {
	mgr := testManager(t)
	if _, err := mgr.RunJob(context.Background(), &api.RunJobRequest{AllowEgress: true}); err == nil {
		t.Fatal("expected egress rejection")
	}
}

func TestRunJobRejectsBadQuote(t *testing.T) {
	mgr := testManager(t)
	if _, err := mgr.RunJob(context.Background(), &api.RunJobRequest{AttestationQuote: "", Payload: "p"}); err == nil {
		t.Fatal("expected attestation failure")
	}
}
