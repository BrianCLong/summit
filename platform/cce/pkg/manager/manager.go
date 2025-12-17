package manager

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/summit/cce/pkg/api"
	"github.com/summit/cce/pkg/attestation"
	"github.com/summit/cce/pkg/sealed"
)

// JobResult describes the processed output.
type JobResult struct {
	Hash         []byte
	SealedResult []byte
	AuditToken   string
}

// Manager orchestrates attestation and sealed execution.
type Manager struct {
	verifier *attestation.Verifier
	storage  *sealed.Storage
}

func NewManager(verifier *attestation.Verifier, storage *sealed.Storage) *Manager {
	return &Manager{verifier: verifier, storage: storage}
}

// Run executes the manifest job inside the enclave.
func (m *Manager) Run(req api.RunJobRequest) (JobResult, error) {
	quotes := make([]attestation.Quote, 0, len(req.Manifest.AttestationQuotes))
	for _, raw := range req.Manifest.AttestationQuotes {
		quotes = append(quotes, attestation.Quote{Raw: raw, PCRDigest: raw, Region: req.ClientRegion})
	}

	if err := m.verifier.VectorFromQuotes(quotes); err != nil {
		return JobResult{}, fmt.Errorf("attestation failed: %w", err)
	}

	// basic no-egress enforcement
	if req.AllowEgress {
		return JobResult{}, fmt.Errorf("egress not permitted for enclave workloads")
	}

	digest := sha256.Sum256(req.Manifest.Payload)
	sealedResult, err := m.storage.Seal(req.Manifest.Payload, digest[:])
	if err != nil {
		return JobResult{}, err
	}

	audit := fmt.Sprintf("cce:%s:%s", req.Manifest.JobID, time.Now().UTC().Format(time.RFC3339))

	return JobResult{Hash: digest[:], SealedResult: sealedResult, AuditToken: audit}, nil
}

// UnsealResult decrypts sealed result after attest.
func (m *Manager) UnsealResult(result []byte, measurement []byte) ([]byte, error) {
	return m.storage.Unseal(result, measurement)
}

func FormatDigest(d []byte) string {
	return hex.EncodeToString(d)
}
