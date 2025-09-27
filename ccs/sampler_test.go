package ccs

import (
	"crypto/ed25519"
	"encoding/hex"
	"testing"
)

func testKeypair(t *testing.T) (ed25519.PublicKey, ed25519.PrivateKey) {
	t.Helper()
	seed, err := hex.DecodeString("1a0d6b29f9796dfd7c9230abd6f3a5b4f6274957332b26738d0fdb59bd4cb0f1")
	if err != nil {
		t.Fatalf("decode seed: %v", err)
	}
	priv := ed25519.NewKeyFromSeed(seed)
	return priv.Public().(ed25519.PublicKey), priv
}

func sampleParticipants() []Participant {
	return []Participant{
		{ID: "p1", Attributes: map[string]string{"region": "na", "tier": "control"}, Eligible: true},
		{ID: "p2", Attributes: map[string]string{"region": "na", "tier": "treatment"}, Eligible: true},
		{ID: "p3", Attributes: map[string]string{"region": "eu", "tier": "control"}, Eligible: true},
		{ID: "p4", Attributes: map[string]string{"region": "eu", "tier": "treatment"}, Eligible: true},
		{ID: "p5", Attributes: map[string]string{"region": "na", "tier": "control"}, Eligible: true},
		{ID: "p6", Attributes: map[string]string{"region": "na", "tier": "treatment"}, Eligible: true},
	}
}

func TestSampleDeterministic(t *testing.T) {
	_, priv := testKeypair(t)
	sampler, err := NewSampler(priv)
	if err != nil {
		t.Fatalf("sampler: %v", err)
	}
	seed, err := hex.DecodeString("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	if err != nil {
		t.Fatalf("decode seed: %v", err)
	}

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

	first, err := sampler.Sample(participants, SamplingConfig{Plan: plan, Seed: seed})
	if err != nil {
		t.Fatalf("sample: %v", err)
	}
	second, err := sampler.Sample(participants, SamplingConfig{Plan: plan, Seed: seed})
	if err != nil {
		t.Fatalf("sample second: %v", err)
	}

	if len(first.Cohort) != plan.Total() {
		t.Fatalf("expected %d participants, got %d", plan.Total(), len(first.Cohort))
	}
	for i := range first.Cohort {
		if first.Cohort[i] != second.Cohort[i] {
			t.Fatalf("cohort mismatch at %d", i)
		}
	}
	if err := VerifyCertificate(participants, first.Certificate); err != nil {
		t.Fatalf("verify: %v", err)
	}
}
