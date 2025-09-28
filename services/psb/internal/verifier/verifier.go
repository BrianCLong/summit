package verifier

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"

	"github.com/summit/psb/internal/model"
	"github.com/summit/psb/internal/policy"
	"github.com/summit/psb/internal/vrf"
)

type ValidationResult struct {
	Samples map[string][]model.Record
}

func Verify(cert model.SamplingCertificate, dataset model.Dataset) (ValidationResult, error) {
	if cert.PartnerID == "" {
		return ValidationResult{}, errors.New("certificate missing partner id")
	}
	pubKey, err := vrf.PublicKeyFromHex(cert.VRFPublicKey)
	if err != nil {
		return ValidationResult{}, err
	}
	recordIndex := make(map[string]model.Record, len(dataset.Records))
	for _, record := range dataset.Records {
		recordIndex[record.ID] = record
	}
	exclusions := make(map[string]struct{})
	for _, id := range cert.Exclusions {
		exclusions[id] = struct{}{}
	}
	samples := make(map[string][]model.Record)
	alreadySampled := make(map[string]struct{})

	for _, stratum := range cert.Strata {
		proofBytes, err := hex.DecodeString(stratum.SeedProof)
		if err != nil {
			return ValidationResult{}, fmt.Errorf("invalid seed proof for %s: %w", stratum.Name, err)
		}
		outputBytes, err := hex.DecodeString(stratum.SeedOutput)
		if err != nil {
			return ValidationResult{}, fmt.Errorf("invalid seed output for %s: %w", stratum.Name, err)
		}
		if err := vrf.Verify(pubKey, cert.Seed, stratum.Name, proofBytes, outputBytes); err != nil {
			return ValidationResult{}, fmt.Errorf("stratum %s: %w", stratum.Name, err)
		}

		candidates := policy.Filter(dataset.Records, cert.PartnerID, stratum.Geo, stratum.ConsentTags, exclusions, alreadySampled)
		ranked := scoreWithSeed(outputBytes, candidates)

		expectedCount := stratum.Target
		if len(ranked) < expectedCount {
			expectedCount = len(ranked)
		}
		if len(stratum.SampledIDs) != expectedCount {
			return ValidationResult{}, fmt.Errorf("stratum %s expected %d sampled ids but got %d", stratum.Name, expectedCount, len(stratum.SampledIDs))
		}

		selected := make([]model.Record, 0, expectedCount)
		for i := 0; i < expectedCount; i++ {
			expectedID := ranked[i].record.ID
			if stratum.SampledIDs[i] != expectedID {
				return ValidationResult{}, fmt.Errorf("stratum %s mismatch at position %d: certificate has %s, recomputed %s", stratum.Name, i, stratum.SampledIDs[i], expectedID)
			}
			rec, ok := recordIndex[expectedID]
			if !ok {
				return ValidationResult{}, fmt.Errorf("record %s referenced in certificate but missing from dataset", expectedID)
			}
			if _, ok := exclusions[expectedID]; ok {
				return ValidationResult{}, fmt.Errorf("record %s should be excluded", expectedID)
			}
			if !policy.HasConsent(rec, cert.PartnerID) {
				return ValidationResult{}, fmt.Errorf("record %s missing consent for partner %s", expectedID, cert.PartnerID)
			}
			selected = append(selected, rec)
			alreadySampled[expectedID] = struct{}{}
		}
		samples[stratum.Name] = selected
	}

	return ValidationResult{Samples: samples}, nil
}

type scoredRecord struct {
	record model.Record
	score  []byte
}

func scoreWithSeed(seed []byte, records []model.Record) []scoredRecord {
	scored := make([]scoredRecord, 0, len(records))
	for _, record := range records {
		digest := sha256.Sum256(append(seed, []byte(":"+record.ID)...))
		scored = append(scored, scoredRecord{record: record, score: digest[:]})
	}
	sort.SliceStable(scored, func(i, j int) bool {
		return lexicographicLess(scored[i].score, scored[j].score)
	})
	return scored
}

func lexicographicLess(a, b []byte) bool {
	for i := 0; i < len(a) && i < len(b); i++ {
		if a[i] < b[i] {
			return true
		}
		if a[i] > b[i] {
			return false
		}
	}
	return len(a) < len(b)
}
