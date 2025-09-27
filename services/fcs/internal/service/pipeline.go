package service

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"example.com/summit/fcs/internal/model"
	"example.com/summit/fcs/internal/provenance"
	"example.com/summit/fcs/internal/store"
)

// Pipeline encapsulates the end-to-end canary lifecycle: seeding, detection,
// and attribution reporting. Collapsing the responsibilities into a single
// coordination struct keeps the business rules in one place and avoids the
// need for callers to wire three separate services together.
type Pipeline struct {
	stores   map[model.StoreKind]store.Store
	prov     *provenance.Manager
	mu       sync.RWMutex
	registry map[string]model.CanaryRecord
}

// NewPipeline constructs a Pipeline ensuring the provided stores are uniquely
// keyed by their StoreKind. The resulting Pipeline is safe for concurrent use.
func NewPipeline(stores map[model.StoreKind]store.Store, prov *provenance.Manager) (*Pipeline, error) {
	if prov == nil {
		return nil, errors.New("provenance manager is required")
	}
	if len(stores) == 0 {
		return nil, errors.New("at least one store must be configured")
	}

	normalised := make(map[model.StoreKind]store.Store, len(stores))
	for kind, st := range stores {
		if st == nil {
			return nil, fmt.Errorf("store %s is nil", kind)
		}
		if _, exists := normalised[kind]; exists {
			return nil, fmt.Errorf("duplicate store configured for %s", kind)
		}
		normalised[kind] = st
	}

	return &Pipeline{
		stores:   normalised,
		prov:     prov,
		registry: make(map[string]model.CanaryRecord),
	}, nil
}

// Seed plants a canary across the requested federated stores and returns the
// resulting record containing signed provenance.
func (p *Pipeline) Seed(ctx context.Context, spec model.CanarySpec) (model.CanaryRecord, error) {
	if spec.Scope == "" {
		return model.CanaryRecord{}, errors.New("scope is required")
	}
	if spec.TTLSeconds <= 0 {
		return model.CanaryRecord{}, errors.New("ttlSeconds must be greater than zero")
	}
	if len(spec.Stores) == 0 {
		return model.CanaryRecord{}, errors.New("at least one store must be specified")
	}

	seenStores := make(map[model.StoreKind]struct{}, len(spec.Stores))
	for _, kind := range spec.Stores {
		if _, ok := p.stores[kind]; !ok {
			return model.CanaryRecord{}, fmt.Errorf("store %s not configured", kind)
		}
		if _, duplicate := seenStores[kind]; duplicate {
			return model.CanaryRecord{}, fmt.Errorf("store %s specified multiple times", kind)
		}
		seenStores[kind] = struct{}{}
	}

	seededAt := time.Now().UTC()
	expiresAt := seededAt.Add(time.Duration(spec.TTLSeconds) * time.Second)
	canaryID := uuid.NewString()

	prov, err := p.prov.BuildProvenance(canaryID, spec.Scope, spec.TTLSeconds, seededAt, expiresAt)
	if err != nil {
		return model.CanaryRecord{}, fmt.Errorf("build provenance: %w", err)
	}

	normalisedSpec := model.CloneCanarySpec(spec)
	sort.Slice(normalisedSpec.Stores, func(i, j int) bool {
		return normalisedSpec.Stores[i] < normalisedSpec.Stores[j]
	})

	record := model.CanaryRecord{
		ID:         canaryID,
		Spec:       normalisedSpec,
		SeededAt:   seededAt,
		ExpiresAt:  expiresAt,
		Provenance: prov,
	}

	for _, kind := range spec.Stores {
		st := p.stores[kind]
		if err := st.Put(ctx, model.StoredCanary{Store: kind, Record: record}); err != nil {
			return model.CanaryRecord{}, fmt.Errorf("store %s put failed: %w", kind, err)
		}
	}

	p.mu.Lock()
	p.registry[canaryID] = record
	p.mu.Unlock()

	return record, nil
}

// Get returns the seeded canary by id when tracked locally.
func (p *Pipeline) Get(_ context.Context, canaryID string) (model.CanaryRecord, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	record, ok := p.registry[canaryID]
	return record, ok
}

// List exposes all canaries tracked by the pipeline.
func (p *Pipeline) List(_ context.Context) []model.CanaryRecord {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := make([]model.CanaryRecord, 0, len(p.registry))
	for _, record := range p.registry {
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].ID < out[j].ID
	})
	return out
}

// Scan enumerates every configured store, returning detections with validated
// provenance for canaries that have not yet expired.
func (p *Pipeline) Scan(ctx context.Context) ([]model.Detection, error) {
	now := time.Now().UTC()
	detections := make([]model.Detection, 0)

	for _, st := range p.stores {
		results, err := st.List(ctx)
		if err != nil {
			return nil, err
		}
		for _, stored := range results {
			if stored.Record.ExpiresAt.Before(now) {
				continue
			}
			if !p.prov.VerifyProvenance(stored.Record.Provenance) {
				continue
			}
			observed := now
			confidence := detectionConfidence(stored.Record, observed)
			detections = append(detections, model.Detection{
				CanaryID:   stored.Record.ID,
				Scope:      stored.Record.Spec.Scope,
				Store:      stored.Store,
				Observed:   observed,
				Confidence: confidence,
				Provenance: stored.Record.Provenance,
			})
		}
	}

	sort.Slice(detections, func(i, j int) bool {
		if detections[i].Scope == detections[j].Scope {
			return detections[i].CanaryID < detections[j].CanaryID
		}
		return detections[i].Scope < detections[j].Scope
	})

	return detections, nil
}

// BuildAttributionReport groups detections by canary and scope to produce a
// structured attribution report. The function is deterministic to make tests
// and API clients simpler.
func (p *Pipeline) BuildAttributionReport(ctx context.Context) (model.AttributionReport, error) {
	detections, err := p.Scan(ctx)
	if err != nil {
		return model.AttributionReport{}, err
	}

	grouped := make(map[string]model.AttributionFinding)
	for _, detection := range detections {
		finding, ok := grouped[detection.CanaryID]
		if !ok {
			finding = model.AttributionFinding{
				CanaryID:   detection.CanaryID,
				Scope:      detection.Scope,
				Stores:     []model.StoreKind{detection.Store},
				Confidence: detection.Confidence,
				Provenance: detection.Provenance,
			}
		} else {
			finding.Stores = append(finding.Stores, detection.Store)
			if detection.Confidence < finding.Confidence {
				finding.Confidence = detection.Confidence
			}
		}
		grouped[detection.CanaryID] = finding
	}

	findings := make([]model.AttributionFinding, 0, len(grouped))
	for _, finding := range grouped {
		sort.Slice(finding.Stores, func(i, j int) bool { return finding.Stores[i] < finding.Stores[j] })
		findings = append(findings, finding)
	}

	sort.Slice(findings, func(i, j int) bool {
		if findings[i].Scope == findings[j].Scope {
			return findings[i].CanaryID < findings[j].CanaryID
		}
		return findings[i].Scope < findings[j].Scope
	})

	return model.AttributionReport{
		GeneratedAt: time.Now().UTC(),
		Findings:    findings,
	}, nil
}

// PublicKeyHex returns the provenance manager's public key for clients that
// need to perform offline verification.
func (p *Pipeline) PublicKeyHex() string {
	return p.prov.PublicKeyHex()
}

// VerifyProvenance proxies verification to the provenance manager. This keeps
// validation logic colocated with the pipeline while still allowing tests or
// alternate front-ends to re-use the logic.
func (p *Pipeline) VerifyProvenance(prov model.Provenance) bool {
	return p.prov.VerifyProvenance(prov)
}

func detectionConfidence(record model.CanaryRecord, observed time.Time) float64 {
	lifetime := record.ExpiresAt.Sub(record.SeededAt)
	if lifetime <= 0 {
		return 0.5
	}
	remaining := record.ExpiresAt.Sub(observed)
	if remaining <= 0 {
		return 0.5
	}
	ratio := remaining.Seconds() / lifetime.Seconds()
	if ratio < 0 {
		ratio = 0
	}
	if ratio > 1 {
		ratio = 1
	}
	confidence := 0.5 + 0.5*ratio
	if confidence > 0.99 {
		confidence = 0.99
	}
	if confidence < 0.5 {
		confidence = 0.5
	}
	return confidence
}
