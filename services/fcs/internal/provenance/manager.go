package provenance

import (
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"example.com/summit/fcs/internal/model"
)

// Manager issues provenance proofs for planted canaries and verifies them offline.
type Manager struct {
	privKey       ed25519.PrivateKey
	pubKey        ed25519.PublicKey
	retrievalSeed []byte
}

// NewManager builds a manager from an existing ed25519 key pair and retrieval seed.
func NewManager(privateKey ed25519.PrivateKey, retrievalSeed []byte) (*Manager, error) {
	if len(privateKey) != ed25519.PrivateKeySize {
		return nil, errors.New("invalid private key length")
	}
	pub := privateKey.Public().(ed25519.PublicKey)
	if len(retrievalSeed) == 0 {
		retrievalSeed = make([]byte, 32)
		if _, err := rand.Read(retrievalSeed); err != nil {
			return nil, fmt.Errorf("generate retrieval seed: %w", err)
		}
	}
	seed := make([]byte, len(retrievalSeed))
	copy(seed, retrievalSeed)
	return &Manager{privKey: privateKey, pubKey: pub, retrievalSeed: seed}, nil
}

// NewRandomManager generates fresh keys for runtime usage.
func NewRandomManager() (*Manager, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("generate ed25519 key: %w", err)
	}
	retrievalSeed := make([]byte, 32)
	if _, err := rand.Read(retrievalSeed); err != nil {
		return nil, fmt.Errorf("generate retrieval seed: %w", err)
	}
	return &Manager{privKey: priv, pubKey: pub, retrievalSeed: retrievalSeed}, nil
}

// BuildProvenance constructs and signs provenance for a canary placement.
func (m *Manager) BuildProvenance(canaryID, scope string, ttlSeconds int64, seededAt, expiresAt time.Time) (model.Provenance, error) {
	retrievalSignature := m.computeRetrievalSignature(canaryID, scope, seededAt, expiresAt)
	prov := model.Provenance{
		CanaryID:           canaryID,
		Scope:              scope,
		TTLSeconds:         ttlSeconds,
		SeededAt:           seededAt.UTC(),
		ExpiresAt:          expiresAt.UTC(),
		RetrievalSignature: retrievalSignature,
	}
	msg := messageForProvenance(prov)
	sig := ed25519.Sign(m.privKey, msg)
	prov.Signature = base64.RawStdEncoding.EncodeToString(sig)
	return prov, nil
}

// VerifyProvenance validates the ed25519 signature for offline validation.
func (m *Manager) VerifyProvenance(prov model.Provenance) bool {
	msg := messageForProvenance(prov)
	sig, err := base64.RawStdEncoding.DecodeString(prov.Signature)
	if err != nil {
		return false
	}
	return ed25519.Verify(m.pubKey, msg, sig)
}

// PublicKeyHex returns the hex encoded ed25519 public key for offline verification.
func (m *Manager) PublicKeyHex() string {
	return hex.EncodeToString(m.pubKey)
}

// computeRetrievalSignature derives a deterministic retrieval signature token.
func (m *Manager) computeRetrievalSignature(canaryID, scope string, seededAt, expiresAt time.Time) string {
	mac := hmac.New(sha256.New, m.retrievalSeed)
	// Retrieval signature binds the identity, scope, and critical timestamps.
	fmt.Fprintf(mac, "%s|%s|%d|%d", canaryID, scope, seededAt.Unix(), expiresAt.Unix())
	return base64.RawStdEncoding.EncodeToString(mac.Sum(nil))
}

func messageForProvenance(prov model.Provenance) []byte {
	// Canonical message ordering to guarantee offline verification parity.
	payload := fmt.Sprintf("%s|%s|%d|%d|%d|%s",
		prov.CanaryID,
		prov.Scope,
		prov.TTLSeconds,
		prov.SeededAt.Unix(),
		prov.ExpiresAt.Unix(),
		prov.RetrievalSignature,
	)
	return []byte(payload)
}
