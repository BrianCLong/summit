package manager

import (
	"testing"

	"github.com/summit/cce/pkg/api"
	"github.com/summit/cce/pkg/attestation"
	"github.com/summit/cce/pkg/sealed"
)

func TestRunJobEchoAndHash(t *testing.T) {
	verifier := attestation.NewVerifier(attestation.Policy{AllowedPCRs: [][]byte{[]byte("quote")}, AllowedRegion: "us-east-1"})
	storage := sealed.NewStorage()
	mgr := NewManager(verifier, storage)

	req := api.RunJobRequest{
		Manifest:     api.JobManifest{JobID: "job-1", Payload: []byte("payload"), AttestationQuotes: [][]byte{[]byte("quote")}},
		ClientRegion: "us-east-1",
	}

	result, err := mgr.Run(req)
	if err != nil {
		t.Fatalf("run failed: %v", err)
	}

	if len(result.Hash) == 0 || len(result.SealedResult) == 0 {
		t.Fatalf("expected hash and sealed result")
	}

	opened, err := storage.Unseal(result.SealedResult, result.Hash)
	if err != nil {
		t.Fatalf("unseal failed: %v", err)
	}
	if string(opened) != "payload" {
		t.Fatalf("unexpected payload: %s", opened)
	}
}
