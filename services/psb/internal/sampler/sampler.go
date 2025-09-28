package sampler

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/summit/psb/internal/model"
	"github.com/summit/psb/internal/policy"
	"github.com/summit/psb/internal/vrf"
)

type Sampler struct {
	dataset   model.Dataset
	privKey   ed25519.PrivateKey
	publicKey ed25519.PublicKey
	now       func() time.Time
}

type rankedRecord struct {
	record model.Record
	score  []byte
}

func New(dataset model.Dataset, priv ed25519.PrivateKey) (*Sampler, error) {
	if len(priv) != ed25519.PrivateKeySize {
		return nil, errors.New("invalid ed25519 private key length")
	}
	pub := priv.Public().(ed25519.PublicKey)
	return &Sampler{dataset: dataset, privKey: priv, publicKey: pub, now: time.Now}, nil
}

func (s *Sampler) WithClock(now func() time.Time) *Sampler {
	if now != nil {
		s.now = now
	}
	return s
}

func (s *Sampler) PublicKeyHex() string {
	return hex.EncodeToString(s.publicKey)
}

func (s *Sampler) Sample(req model.SamplingRequest) (model.SamplingResponse, error) {
	if err := validateRequest(req); err != nil {
		return model.SamplingResponse{}, err
	}
	exclusionSet := toSet(req.Exclusions)

	selectedGlobal := make(map[string]struct{})
	samples := make(map[string][]model.Record)
	certificates := make([]model.StratumCertificate, 0, len(req.Strata))

	for _, stratum := range req.Strata {
		seedOutput, proof, err := vrf.Derive(s.privKey, req.Seed, stratum.Name)
		if err != nil {
			return model.SamplingResponse{}, err
		}

		candidates := policy.Filter(s.dataset.Records, req.PartnerID, stratum.Geo, stratum.ConsentTags, exclusionSet, selectedGlobal)
		ranked := rankRecords(seedOutput, candidates)

		limit := stratum.Target
		if len(ranked) < limit {
			limit = len(ranked)
		}

		stratumRecords := make([]model.Record, 0, limit)
		sampledIDs := make([]string, 0, limit)
		for i := 0; i < limit; i++ {
			rec := ranked[i].record
			stratumRecords = append(stratumRecords, rec)
			sampledIDs = append(sampledIDs, rec.ID)
			selectedGlobal[rec.ID] = struct{}{}
		}

		samples[stratum.Name] = stratumRecords
		certificates = append(certificates, model.StratumCertificate{
			Name:        stratum.Name,
			Target:      stratum.Target,
			Geo:         stratum.Geo,
			ConsentTags: stratum.ConsentTags,
			SampledIDs:  sampledIDs,
			SeedOutput:  hex.EncodeToString(seedOutput),
			SeedProof:   hex.EncodeToString(proof),
		})
	}

	nowFn := s.now
	if nowFn == nil {
		nowFn = time.Now
	}
	currentTime := nowFn().UTC()

	cert := model.SamplingCertificate{
		PartnerID:    req.PartnerID,
		Seed:         req.Seed,
		VRFPublicKey: s.PublicKeyHex(),
		Strata:       certificates,
		Exclusions:   req.Exclusions,
		GeneratedAt:  currentTime,
	}

	return model.SamplingResponse{Samples: samples, Certificate: cert}, nil
}

func rankRecords(stratumSeed []byte, records []model.Record) []rankedRecord {
	ranked := make([]rankedRecord, 0, len(records))
	for _, record := range records {
		digest := sha256.Sum256(append(stratumSeed, []byte(":"+record.ID)...))
		ranked = append(ranked, rankedRecord{record: record, score: digest[:]})
	}
	sort.SliceStable(ranked, func(i, j int) bool {
		return lexicographicLess(ranked[i].score, ranked[j].score)
	})
	return ranked
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

func toSet(values []string) map[string]struct{} {
	result := make(map[string]struct{}, len(values))
	for _, v := range values {
		result[v] = struct{}{}
	}
	return result
}

func validateRequest(req model.SamplingRequest) error {
	if req.PartnerID == "" {
		return errors.New("partner_id is required")
	}
	if req.Seed == "" {
		return errors.New("seed is required")
	}
	if len(req.Strata) == 0 {
		return errors.New("at least one stratum is required")
	}
	seenNames := make(map[string]struct{}, len(req.Strata))
	for _, stratum := range req.Strata {
		if stratum.Name == "" {
			return errors.New("strata name is required")
		}
		if _, exists := seenNames[stratum.Name]; exists {
			return fmt.Errorf("duplicate stratum name %q", stratum.Name)
		}
		if stratum.Target <= 0 {
			return fmt.Errorf("stratum %q target must be positive", stratum.Name)
		}
		seenNames[stratum.Name] = struct{}{}
	}
	return nil
}
