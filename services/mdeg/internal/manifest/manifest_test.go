package manifest

import (
	"testing"
	"time"

	"github.com/summit/mdeg/internal/policy"
)

func TestSignerRoundTrip(t *testing.T) {
	signer, err := NewSigner("secret")
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}

	record := &Record{
		ManifestID:  "man-1",
		RequestID:   "req-1",
		PolicyID:    "policy-1",
		Destination: policy.Destination{Provider: "aws", Bucket: "bucket", Region: "us-east-1"},
		DataClass:   "restricted",
		Bytes:       512,
		Cost:        1.23,
		Timestamp:   time.Now().UTC(),
	}

	signature, err := signer.Sign(record)
	if err != nil {
		t.Fatalf("failed to sign: %v", err)
	}
	record.Signature = signature

	ok, err := signer.Verify(record)
	if err != nil {
		t.Fatalf("verify error: %v", err)
	}
	if !ok {
		t.Fatalf("expected signature to verify")
	}
}

func TestStoreReconcile(t *testing.T) {
	store := NewStore()
	record := &Record{
		ManifestID:  "man-2",
		RequestID:   "req-2",
		PolicyID:    "policy-1",
		Destination: policy.Destination{Provider: "aws", Bucket: "bucket", Region: "us-east-1"},
		DataClass:   "restricted",
		Bytes:       1024,
		Cost:        2.0,
		Timestamp:   time.Now().UTC(),
		Signature:   "abc",
	}
	store.Save(record)

	if _, err := store.Reconcile("man-2", 100, 2.0); err == nil {
		t.Fatalf("expected byte mismatch error")
	}

	reconciled, err := store.Reconcile("man-2", 1024, 2.0)
	if err != nil {
		t.Fatalf("expected reconciliation to succeed: %v", err)
	}
	if !reconciled.Reconciled {
		t.Fatalf("expected manifest to be marked reconciled")
	}
}
