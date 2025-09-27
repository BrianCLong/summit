package plan

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strings"

	"golang.org/x/crypto/ed25519"
)

// ManifestSigner creates deterministic signatures for rollout manifests.
type ManifestSigner struct {
	key ed25519.PrivateKey
}

// NewManifestSignerFromFile loads an ed25519 private key encoded in base64 from disk.
func NewManifestSignerFromFile(path string) (*ManifestSigner, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read signing key: %w", err)
	}
	cleaned := strings.TrimSpace(string(raw))
	keyBytes, err := base64.StdEncoding.DecodeString(cleaned)
	if err != nil {
		return nil, fmt.Errorf("decode signing key: %w", err)
	}
	if l := len(keyBytes); l != ed25519.PrivateKeySize {
		return nil, fmt.Errorf("signing key length %d does not match %d", l, ed25519.PrivateKeySize)
	}
	return &ManifestSigner{key: ed25519.PrivateKey(keyBytes)}, nil
}

// Sign produces a base64 signature for the provided payload.
func (s *ManifestSigner) Sign(payload []byte) (string, error) {
	if s == nil || len(s.key) == 0 {
		return "", errors.New("signer not initialised")
	}
	signature := ed25519.Sign(s.key, payload)
	return base64.StdEncoding.EncodeToString(signature), nil
}

// PublicKey returns the base64 encoded public key for auditing.
func (s *ManifestSigner) PublicKey() string {
	if s == nil || len(s.key) == 0 {
		return ""
	}
	pub := s.key.Public().(ed25519.PublicKey)
	return base64.StdEncoding.EncodeToString(pub)
}
