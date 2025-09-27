package mpes

import (
	"crypto/ed25519"
	"encoding/json"
	"fmt"
)

// ScorecardSigner handles signing and verifying party scorecards.
type ScorecardSigner struct {
	publicKey  ed25519.PublicKey
	privateKey ed25519.PrivateKey
}

// NewScorecardSigner generates a signer from the provided seed. If seed is nil a random key is created.
func NewScorecardSigner(seed []byte) (*ScorecardSigner, error) {
	if seed != nil {
		if len(seed) != ed25519.SeedSize {
			return nil, fmt.Errorf("seed must be %d bytes", ed25519.SeedSize)
		}
		privateKey := ed25519.NewKeyFromSeed(seed)
		publicKey := privateKey.Public().(ed25519.PublicKey)
		return &ScorecardSigner{publicKey: publicKey, privateKey: privateKey}, nil
	}
	publicKey, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to generate ed25519 key: %w", err)
	}
	return &ScorecardSigner{publicKey: publicKey, privateKey: privateKey}, nil
}

// PublicKey returns the signer's public key for verification.
func (s *ScorecardSigner) PublicKey() ed25519.PublicKey {
	return append(ed25519.PublicKey(nil), s.publicKey...)
}

// SignScorecard calculates the signature over the canonical payload.
func (s *ScorecardSigner) SignScorecard(scorecard *Scorecard) error {
	payload, err := scorecardPayload(scorecard)
	if err != nil {
		return err
	}
	scorecard.Signature = ed25519.Sign(s.privateKey, payload)
	return nil
}

// VerifyScorecard ensures the signature matches the provided scorecard.
func (s *ScorecardSigner) VerifyScorecard(scorecard Scorecard) (bool, error) {
	payload, err := scorecardPayload(&scorecard)
	if err != nil {
		return false, err
	}
	if len(scorecard.Signature) == 0 {
		return false, fmt.Errorf("scorecard signature missing")
	}
	return ed25519.Verify(s.publicKey, payload, scorecard.Signature), nil
}

func scorecardPayload(scorecard *Scorecard) ([]byte, error) {
	clone := scorecard.CloneWithoutSignature()
	return json.Marshal(struct {
		PartyID   string            `json:"party_id"`
		Scores    map[string]Score  `json:"scores"`
		Metadata  map[string]string `json:"metadata,omitempty"`
		CreatedAt int64             `json:"created_at_unix"`
	}{
		PartyID:   clone.PartyID,
		Scores:    clone.TaskScores,
		Metadata:  clone.Metadata,
		CreatedAt: clone.CreatedAt.UnixNano(),
	})
}
