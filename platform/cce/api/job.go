package api

import (
	"context"

	"platform/cce/internal/grpcstub"
)

// RunJobRequest carries payloads and attestation material for enclave execution.
type RunJobRequest struct {
	JobID            string `json:"jobId"`
	Payload          string `json:"payload"`
	ManifestHash     string `json:"manifestHash"`
	AttestationQuote string `json:"attestationQuote"`
	Region           string `json:"region"`
	AllowEgress      bool   `json:"allowEgress"`
	ClientPublicKey  string `json:"clientPublicKey"`
	Nonce            string `json:"nonce"`
}

// RunJobResponse returns deterministic outputs and a sealed blob for persistence.
type RunJobResponse struct {
	JobID       string `json:"jobId"`
	OutputHash  string `json:"outputHash"`
	SealedBlob  string `json:"sealedBlob"`
	Attested    bool   `json:"attested"`
	Region      string `json:"region"`
	Nonce       string `json:"nonce"`
	ProofHandle string `json:"proofHandle"`
}

// ComputeEnclaveServer mirrors a minimal gRPC service contract.
type ComputeEnclaveServer interface {
	RunJob(ctx context.Context, req *RunJobRequest) (*RunJobResponse, error)
}

// RegisterComputeEnclaveServer wires the handler into the lightweight gRPC stub.
func RegisterComputeEnclaveServer(s *grpcstub.Server, srv ComputeEnclaveServer) {
	s.RegisterJSONHandler("/api.ComputeEnclave/RunJob", func(ctx context.Context, body []byte) ([]byte, error) {
		var req RunJobRequest
		if err := grpcstub.Unmarshal(body, &req); err != nil {
			return nil, err
		}
		res, err := srv.RunJob(ctx, &req)
		if err != nil {
			return nil, err
		}
		return grpcstub.Marshal(res)
	})
}
