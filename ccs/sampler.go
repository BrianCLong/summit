package ccs

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"sort"
	"time"
)

// Sampler draws stratified cohorts using VRF-style randomness derived from ed25519 signatures.
type Sampler struct {
	priv ed25519.PrivateKey
	pub  ed25519.PublicKey
}

// NewSampler creates a sampler from an ed25519 private key.
func NewSampler(priv ed25519.PrivateKey) (*Sampler, error) {
	if len(priv) != ed25519.PrivateKeySize {
		return nil, fmt.Errorf("invalid ed25519 private key size")
	}
	pub := priv.Public().(ed25519.PublicKey)
	return &Sampler{priv: priv, pub: pub}, nil
}

// PublicKey returns the samplers public key.
func (s *Sampler) PublicKey() ed25519.PublicKey {
	return s.pub
}

// GenerateSeed returns a fresh sampling seed.
func GenerateSeed() ([]byte, error) {
	seed := make([]byte, 32)
	if _, err := rand.Read(seed); err != nil {
		return nil, fmt.Errorf("generate seed: %w", err)
	}
	return seed, nil
}

// SamplingConfig configures a sampling run.
type SamplingConfig struct {
	Plan       StratificationPlan
	Seed       []byte
	Exclusions []string
}

// SelectedParticipant includes VRF proof details for an enrolled subject.
type SelectedParticipant struct {
	ID         string `json:"id"`
	Stratum    string `json:"stratum"`
	Randomness string `json:"randomness"`
	Proof      string `json:"proof"`
}

// ParticipantRandomness records VRF output for every considered participant.
type ParticipantRandomness struct {
	ID         string `json:"id"`
	Stratum    string `json:"stratum"`
	Randomness string `json:"randomness"`
	Proof      string `json:"proof"`
	Excluded   bool   `json:"excluded"`
}

// StratumBalance captures achieved counts relative to plan.
type StratumBalance struct {
	Target    int `json:"target"`
	Selected  int `json:"selected"`
	Available int `json:"available"`
}

// SamplingCertificate documents a cohort draw.
type SamplingCertificate struct {
	Seed       string                    `json:"seed"`
	PublicKey  string                    `json:"publicKey"`
	Plan       StratificationPlan        `json:"plan"`
	Strata     map[string]StratumBalance `json:"strata"`
	Exclusions []string                  `json:"exclusions"`
	Cohort     []SelectedParticipant     `json:"cohort"`
	Transcript []ParticipantRandomness   `json:"transcript"`
	Timestamp  time.Time                 `json:"timestamp"`
	Hash       string                    `json:"hash"`
}

// CohortResult bundles the cohort and certificate.
type CohortResult struct {
	Cohort      []SelectedParticipant
	Certificate SamplingCertificate
}

// Sample executes a cohort draw.
func (s *Sampler) Sample(participants []Participant, cfg SamplingConfig) (CohortResult, error) {
	if s == nil {
		return CohortResult{}, fmt.Errorf("sampler is nil")
	}
	if err := cfg.Plan.Validate(); err != nil {
		return CohortResult{}, err
	}
	if len(cfg.Seed) == 0 {
		return CohortResult{}, fmt.Errorf("seed must not be empty")
	}

	normalized := make([]Participant, 0, len(participants))
	for _, raw := range participants {
		participant, err := raw.Normalize()
		if err != nil {
			return CohortResult{}, err
		}
		if !participant.Eligible {
			continue
		}
		normalized = append(normalized, participant)
	}

	exclusionSet := make(map[string]struct{}, len(cfg.Exclusions))
	for _, id := range cfg.Exclusions {
		exclusionSet[id] = struct{}{}
	}

	transcript := make([]ParticipantRandomness, 0, len(normalized))
	strataBuckets := make(map[string][]SelectedParticipant)
	strataBalance := make(map[string]StratumBalance)

	for _, participant := range normalized {
		stratum, err := cfg.Plan.Stratify(participant)
		if err != nil {
			return CohortResult{}, err
		}
		proof, randomness := s.vrfProof(cfg.Seed, participant.ID)
		entry := ParticipantRandomness{
			ID:         participant.ID,
			Stratum:    stratum,
			Randomness: hex.EncodeToString(randomness),
			Proof:      base64.StdEncoding.EncodeToString(proof),
		}
		if _, excluded := exclusionSet[participant.ID]; excluded {
			entry.Excluded = true
			transcript = append(transcript, entry)
			continue
		}
		transcript = append(transcript, entry)
		strataBuckets[stratum] = append(strataBuckets[stratum], SelectedParticipant{
			ID:         participant.ID,
			Stratum:    stratum,
			Randomness: entry.Randomness,
			Proof:      entry.Proof,
		})
	}

	for stratum, bucket := range strataBuckets {
		sort.Slice(bucket, func(i, j int) bool {
			if bucket[i].Randomness == bucket[j].Randomness {
				return bucket[i].ID < bucket[j].ID
			}
			return bucket[i].Randomness < bucket[j].Randomness
		})
		strataBuckets[stratum] = bucket
	}

	cohort := make([]SelectedParticipant, 0, cfg.Plan.Total())
	for stratum, target := range cfg.Plan.Targets {
		bucket := strataBuckets[stratum]
		balance := StratumBalance{Target: target, Available: len(bucket)}
		if len(bucket) < target {
			return CohortResult{}, fmt.Errorf("stratum %s requires %d participants but only %d available", stratum, target, len(bucket))
		}
		selected := bucket[:target]
		balance.Selected = len(selected)
		strataBalance[stratum] = balance
		cohort = append(cohort, selected...)
	}

	sort.Slice(cohort, func(i, j int) bool {
		if cohort[i].Stratum == cohort[j].Stratum {
			if cohort[i].Randomness == cohort[j].Randomness {
				return cohort[i].ID < cohort[j].ID
			}
			return cohort[i].Randomness < cohort[j].Randomness
		}
		return cohort[i].Stratum < cohort[j].Stratum
	})

	seedHex := hex.EncodeToString(cfg.Seed)
	cert := SamplingCertificate{
		Seed:       seedHex,
		PublicKey:  base64.StdEncoding.EncodeToString(s.pub),
		Plan:       cfg.Plan,
		Strata:     strataBalance,
		Exclusions: append([]string{}, cfg.Exclusions...),
		Cohort:     cohort,
		Transcript: transcript,
		Timestamp:  time.Now().UTC().Truncate(time.Second),
	}
	if err := cert.finalizeHash(); err != nil {
		return CohortResult{}, err
	}

	return CohortResult{Cohort: cohort, Certificate: cert}, nil
}

func (s *Sampler) vrfProof(seed []byte, participantID string) ([]byte, []byte) {
	message := append(seed, []byte(participantID)...)
	proof := ed25519.Sign(s.priv, message)
	randomness := sha256.Sum256(proof)
	return proof, randomness[:]
}

func (c *SamplingCertificate) finalizeHash() error {
	clone := *c
	clone.Hash = ""
	payload, err := marshalCanonical(clone)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(payload)
	c.Hash = hex.EncodeToString(sum[:])
	return nil
}
