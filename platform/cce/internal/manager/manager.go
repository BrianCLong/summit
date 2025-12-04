package manager

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"platform/cce/api"
	"platform/cce/internal/attestation"
	"platform/cce/internal/storage"
)

// EnclaveManager orchestrates attestation, execution, and storage.
type EnclaveManager struct {
	verifier      *attestation.Verifier
	storage       *storage.SealedStorage
	kmsWrappedKey string
	region        string
}

// NewEnclaveManager constructs a manager with guardrails for enclave-only execution.
func NewEnclaveManager(verifier *attestation.Verifier, storage *storage.SealedStorage, kmsWrappedKey string, region string) (*EnclaveManager, error) {
	if verifier == nil || storage == nil {
		return nil, errors.New("verifier and storage required")
	}
	if kmsWrappedKey == "" {
		return nil, errors.New("kms wrapped key must be provided")
	}
	region = strings.TrimSpace(region)
	if region == "" {
		region = "us-east-1"
	}
	return &EnclaveManager{verifier: verifier, storage: storage, kmsWrappedKey: kmsWrappedKey, region: region}, nil
}

// RunJob executes a deterministic hash job inside the enclave boundary.
func (m *EnclaveManager) RunJob(ctx context.Context, req *api.RunJobRequest) (*api.RunJobResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}
	if req.AllowEgress {
		return nil, errors.New("egress is not permitted for enclave workloads")
	}
	region := req.Region
	if region == "" {
		region = m.region
	}
	if err := m.verifier.Verify(req.AttestationQuote, req.ManifestHash, region); err != nil {
		return nil, fmt.Errorf("attestation failed: %w", err)
	}
	outputHash := attestation.DeriveMeasurement(req.Payload)
	sealed, err := m.storage.Seal([]byte(outputHash), m.kmsWrappedKey)
	if err != nil {
		return nil, fmt.Errorf("seal failure: %w", err)
	}
	nonce := req.Nonce
	if nonce == "" {
		nonce = randomNonce()
	}
	return &api.RunJobResponse{
		JobID:       req.JobID,
		OutputHash:  outputHash,
		SealedBlob:  sealed,
		Attested:    true,
		Region:      region,
		Nonce:       nonce,
		ProofHandle: fmt.Sprintf("attested:%s:%s", region, nonce),
	}, nil
}

func randomNonce() string {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return "nonce-fallback"
	}
	return base64.StdEncoding.EncodeToString(buf)
}
