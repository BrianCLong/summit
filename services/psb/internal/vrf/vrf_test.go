package vrf

import (
	"bytes"
	"crypto/ed25519"
	"testing"

	"github.com/summit/psb/internal/files"
)

func TestDeriveAndVerify(t *testing.T) {
	priv := loadPrivateKey(t)
	pub := priv.Public().(ed25519.PublicKey)

	output, proof, err := Derive(priv, "seed", "stratum")
	if err != nil {
		t.Fatalf("derive failed: %v", err)
	}
	if len(output) != 32 {
		t.Fatalf("expected 32 byte output, got %d", len(output))
	}
	if err := Verify(pub, "seed", "stratum", proof, output); err != nil {
		t.Fatalf("verify failed: %v", err)
	}

	badOutput := make([]byte, len(output))
	copy(badOutput, output)
	badOutput[0] ^= 0xff
	if err := Verify(pub, "seed", "stratum", proof, badOutput); err == nil {
		t.Fatal("expected verify to fail with mismatched output")
	}
}

func TestPublicKeyFromHex(t *testing.T) {
	priv := loadPrivateKey(t)
	pub := priv.Public().(ed25519.PublicKey)

	encoded := PublicKeyHex(pub)
	decoded, err := PublicKeyFromHex(encoded)
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if !bytes.Equal(decoded, pub) {
		t.Fatal("decoded public key does not match original")
	}
}

func loadPrivateKey(t *testing.T) ed25519.PrivateKey {
	t.Helper()
	priv, err := files.LoadPrivateKey("../../fixtures/vrf_private_key.hex")
	if err != nil {
		t.Fatalf("load private key: %v", err)
	}
	return priv
}
