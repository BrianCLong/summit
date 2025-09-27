package manifest

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/summit/mdeg/internal/policy"
)

// Record captures the signed details of an approved transfer.
type Record struct {
	ManifestID    string             `json:"manifestId"`
	RequestID     string             `json:"requestId"`
	PolicyID      string             `json:"policyId"`
	Destination   policy.Destination `json:"destination"`
	DataClass     string             `json:"dataClass"`
	Bytes         int64              `json:"bytes"`
	Cost          float64            `json:"cost"`
	Timestamp     time.Time          `json:"timestamp"`
	Signature     string             `json:"signature"`
	Reconciled    bool               `json:"reconciled"`
	ProviderBytes int64              `json:"providerBytes,omitempty"`
	ProviderCost  float64            `json:"providerCost,omitempty"`
}

// Signer produces deterministic signatures for manifest payloads.
type Signer struct {
	key []byte
}

// NewSigner builds a signer using the provided secret key.
func NewSigner(secret string) (*Signer, error) {
	if secret == "" {
		return nil, fmt.Errorf("signing key must be provided")
	}
	return &Signer{key: []byte(secret)}, nil
}

// Sign calculates the HMAC-SHA256 signature for the record payload.
func (s *Signer) Sign(record *Record) (string, error) {
	payload := map[string]any{
		"manifestId":  record.ManifestID,
		"requestId":   record.RequestID,
		"policyId":    record.PolicyID,
		"dataClass":   record.DataClass,
		"bytes":       record.Bytes,
		"cost":        record.Cost,
		"destination": record.Destination,
		"timestamp":   record.Timestamp.UnixNano(),
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal manifest payload: %w", err)
	}

	h := hmac.New(sha256.New, s.key)
	if _, err := h.Write(raw); err != nil {
		return "", fmt.Errorf("sign manifest: %w", err)
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// Verify recomputes the signature and ensures it matches the manifest.
func (s *Signer) Verify(record *Record) (bool, error) {
	expected, err := s.Sign(record)
	if err != nil {
		return false, err
	}
	return hmac.Equal([]byte(expected), []byte(record.Signature)), nil
}
