package pbs

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
)

// SigningKey represents an ed25519 keypair used for signing reports.
type SigningKey struct {
	KeyID      string `json:"key_id"`
	PrivateKey string `json:"private_key"`
}

// LoadSigningKey loads a signing key from disk.
func LoadSigningKey(path string) (SigningKey, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return SigningKey{}, fmt.Errorf("read signing key: %w", err)
	}
	var key SigningKey
	if err := json.Unmarshal(raw, &key); err != nil {
		return SigningKey{}, fmt.Errorf("parse signing key: %w", err)
	}
	if key.KeyID == "" {
		return SigningKey{}, errors.New("signing key key_id is required")
	}
	if key.PrivateKey == "" {
		return SigningKey{}, errors.New("signing key private_key is required")
	}
	return key, nil
}

// SignReport attaches a signature to the report using the provided key.
func SignReport(report BacktestReport, key SigningKey) (BacktestReport, error) {
	payload := report
	payload.Signatures = nil

	canonical, err := MarshalCanonicalJSON(payload)
	if err != nil {
		return report, fmt.Errorf("marshal canonical report: %w", err)
	}
	digest := computeDigest(canonical)

	rawKey, err := base64.StdEncoding.DecodeString(key.PrivateKey)
	if err != nil {
		return report, fmt.Errorf("decode private key: %w", err)
	}

	var priv ed25519.PrivateKey
	switch len(rawKey) {
	case ed25519.PrivateKeySize:
		priv = ed25519.PrivateKey(rawKey)
	case ed25519.SeedSize:
		priv = ed25519.NewKeyFromSeed(rawKey)
	default:
		return report, fmt.Errorf("unexpected private key length %d", len(rawKey))
	}

	signature := ed25519.Sign(priv, canonical)
	sig := ReportSignature{
		KeyID:     key.KeyID,
		Algorithm: "ed25519",
		Digest:    digest,
		Signature: base64.StdEncoding.EncodeToString(signature),
	}
	report.Signatures = append(report.Signatures, sig)
	return report, nil
}
