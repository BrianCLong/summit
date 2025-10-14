package ccs

import (
	"encoding/hex"
	"testing"
)

func TestVerifyRejectsTampering(t *testing.T) {
	_, priv := testKeypair(t)
	sampler, err := NewSampler(priv)
	if err != nil {
		t.Fatalf("sampler: %v", err)
	}
	seed, _ := hex.DecodeString("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
	plan := StratificationPlan{
		Keys: []string{"region", "tier"},
		Targets: map[string]int{
			"region=na|tier=control":   1,
			"region=na|tier=treatment": 1,
			"region=eu|tier=control":   1,
			"region=eu|tier=treatment": 1,
		},
	}
	participants := sampleParticipants()
	result, err := sampler.Sample(participants, SamplingConfig{Plan: plan, Seed: seed})
	if err != nil {
		t.Fatalf("sample: %v", err)
	}
	// Tamper with cohort id.
	tampered := result.Certificate
	tampered.Cohort[0].ID = "malicious"
	if err := VerifyCertificate(participants, tampered); err == nil {
		t.Fatalf("expected verification to fail")
	}
}
