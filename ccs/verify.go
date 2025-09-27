package ccs

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
)

// VerifyCertificate replays the cohort draw and ensures the certificate is self-consistent.
func VerifyCertificate(participants []Participant, cert SamplingCertificate) error {
	if err := cert.Plan.Validate(); err != nil {
		return fmt.Errorf("certificate plan invalid: %w", err)
	}
	if cert.Seed == "" {
		return errors.New("certificate missing seed")
	}
	seed, err := hex.DecodeString(cert.Seed)
	if err != nil {
		return fmt.Errorf("decode seed: %w", err)
	}
	pubBytes, err := base64.StdEncoding.DecodeString(cert.PublicKey)
	if err != nil {
		return fmt.Errorf("decode public key: %w", err)
	}
	if len(pubBytes) != ed25519.PublicKeySize {
		return errors.New("invalid public key size")
	}
	pubKey := ed25519.PublicKey(pubBytes)

	// Normalize participants and map by id.
	normalized := make(map[string]Participant, len(participants))
	for _, raw := range participants {
		participant, err := raw.Normalize()
		if err != nil {
			return err
		}
		normalized[participant.ID] = participant
	}

	exclusionSet := make(map[string]struct{}, len(cert.Exclusions))
	for _, id := range cert.Exclusions {
		exclusionSet[id] = struct{}{}
	}

	// Validate transcript entries and build per-stratum buckets.
	strataBuckets := make(map[string][]SelectedParticipant)
	observedTranscript := make(map[string]ParticipantRandomness, len(cert.Transcript))

	for _, entry := range cert.Transcript {
		participant, ok := normalized[entry.ID]
		if !ok {
			return fmt.Errorf("transcript references unknown participant %s", entry.ID)
		}
		expectedStratum, err := cert.Plan.Stratify(participant)
		if err != nil {
			return err
		}
		if entry.Stratum != expectedStratum {
			return fmt.Errorf("participant %s stratum mismatch", entry.ID)
		}
		proofBytes, err := base64.StdEncoding.DecodeString(entry.Proof)
		if err != nil {
			return fmt.Errorf("decode proof for %s: %w", entry.ID, err)
		}
		message := append(seed, []byte(entry.ID)...)
		if !ed25519.Verify(pubKey, message, proofBytes) {
			return fmt.Errorf("invalid proof for participant %s", entry.ID)
		}
		digest := sha256.Sum256(proofBytes)
		hexDigest := hex.EncodeToString(digest[:])
		if entry.Randomness != hexDigest {
			return fmt.Errorf("randomness mismatch for participant %s", entry.ID)
		}
		observedTranscript[entry.ID] = entry
		if entry.Excluded {
			continue
		}
		if _, excluded := exclusionSet[entry.ID]; excluded {
			// already accounted for in certificate
		}
		strataBuckets[entry.Stratum] = append(strataBuckets[entry.Stratum], SelectedParticipant{
			ID:         entry.ID,
			Stratum:    entry.Stratum,
			Randomness: entry.Randomness,
			Proof:      entry.Proof,
		})
	}

	// Ensure transcript covers every participant referenced in cohort.
	for _, cohortEntry := range cert.Cohort {
		if _, ok := observedTranscript[cohortEntry.ID]; !ok {
			return fmt.Errorf("cohort participant %s missing transcript entry", cohortEntry.ID)
		}
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

	// Replay selection.
	derivedCohort := make([]SelectedParticipant, 0, cert.Plan.Total())
	for stratum, target := range cert.Plan.Targets {
		bucket := strataBuckets[stratum]
		balance := cert.Strata[stratum]
		if balance.Target != target {
			return fmt.Errorf("certificate target mismatch for stratum %s", stratum)
		}
		if len(bucket) < target {
			return fmt.Errorf("insufficient participants for stratum %s", stratum)
		}
		balance.Selected = target
		balance.Available = len(bucket)
		cert.Strata[stratum] = balance
		derivedCohort = append(derivedCohort, bucket[:target]...)
	}

	sort.Slice(derivedCohort, func(i, j int) bool {
		if derivedCohort[i].Stratum == derivedCohort[j].Stratum {
			if derivedCohort[i].Randomness == derivedCohort[j].Randomness {
				return derivedCohort[i].ID < derivedCohort[j].ID
			}
			return derivedCohort[i].Randomness < derivedCohort[j].Randomness
		}
		return derivedCohort[i].Stratum < derivedCohort[j].Stratum
	})

	if len(derivedCohort) != len(cert.Cohort) {
		return errors.New("cohort size mismatch")
	}
	for idx := range derivedCohort {
		if derivedCohort[idx] != cert.Cohort[idx] {
			return fmt.Errorf("cohort mismatch at position %d", idx)
		}
	}

	// Validate certificate hash integrity.
	expectedHash := cert.Hash
	if err := cert.finalizeHash(); err != nil {
		return err
	}
	if expectedHash != cert.Hash {
		return errors.New("certificate hash mismatch")
	}
	return nil
}
