package vrf

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
)

// Derive produces a deterministic seed output and proof for the provided
// partner seed and stratum name using the supplied Ed25519 private key.
func Derive(priv ed25519.PrivateKey, seed, stratum string) ([]byte, []byte, error) {
	if len(priv) != ed25519.PrivateKeySize {
		return nil, nil, errors.New("ed25519 private key must be 64 bytes")
	}
	message := material(seed, stratum)
	proof := ed25519.Sign(priv, message)
	digest := sha256.Sum256(proof)
	return digest[:], proof, nil
}

// Verify ensures the proof and seed output were derived from the provided
// public key, partner seed, and stratum name.
func Verify(pub ed25519.PublicKey, seed, stratum string, proof, output []byte) error {
	if len(pub) != ed25519.PublicKeySize {
		return errors.New("ed25519 public key must be 32 bytes")
	}
	message := material(seed, stratum)
	if !ed25519.Verify(pub, message, proof) {
		return errors.New("seed proof verification failed")
	}
	digest := sha256.Sum256(proof)
	if !equalBytes(digest[:], output) {
		return errors.New("seed output mismatch")
	}
	return nil
}

// PublicKeyHex renders an Ed25519 public key as a lowercase hex string.
func PublicKeyHex(pub ed25519.PublicKey) string {
	return hex.EncodeToString(pub)
}

// PublicKeyFromHex decodes a hex encoded Ed25519 public key.
func PublicKeyFromHex(value string) (ed25519.PublicKey, error) {
	raw, err := hex.DecodeString(value)
	if err != nil {
		return nil, fmt.Errorf("invalid public key hex: %w", err)
	}
	if len(raw) != ed25519.PublicKeySize {
		return nil, errors.New("ed25519 public key must be 32 bytes")
	}
	return ed25519.PublicKey(raw), nil
}

func material(seed, stratum string) []byte {
	return []byte(fmt.Sprintf("%s:%s", seed, stratum))
}

func equalBytes(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
