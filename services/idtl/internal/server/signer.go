package server

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
)

type Signer struct {
	private ed25519.PrivateKey
	public  ed25519.PublicKey
}

func NewSigner(seed []byte) (*Signer, error) {
	if len(seed) == 0 {
		pub, priv, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			return nil, err
		}
		return &Signer{private: priv, public: pub}, nil
	}
	if len(seed) < ed25519.SeedSize {
		sum := sha256.Sum256(seed)
		seed = sum[:]
	}
	if len(seed) != ed25519.SeedSize {
		return nil, errors.New("invalid seed length")
	}
	priv := ed25519.NewKeyFromSeed(seed)
	pub := priv.Public().(ed25519.PublicKey)
	return &Signer{private: priv, public: pub}, nil
}

func (s *Signer) Sign(data []byte) (string, error) {
	sig := ed25519.Sign(s.private, data)
	return base64.StdEncoding.EncodeToString(sig), nil
}

func (s *Signer) PublicKey() string {
	return base64.StdEncoding.EncodeToString(s.public)
}

func (s *Signer) Verify(data []byte, signature string) bool {
	sig, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return false
	}
	return ed25519.Verify(s.public, data, sig)
}
