package service

import (
	"sync"
	"time"
)

// Aggregate keeps running totals per policy tier.
type Aggregate struct {
	Usage      WorkloadUsage
	Components map[string]float64
	Total      float64
	Currency   string
}

// MemoryStore is an in-memory implementation of the storage backend.
type MemoryStore struct {
	mu             sync.RWMutex
	charges        map[string][]ChargeRecord
	aggregates     map[string]map[PolicyKey]*Aggregate
	providerTotals map[string]map[PolicyKey]ProviderAggregate
	manifests      map[string]Manifest
}

// NewMemoryStore constructs an empty store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		charges:        make(map[string][]ChargeRecord),
		aggregates:     make(map[string]map[PolicyKey]*Aggregate),
		providerTotals: make(map[string]map[PolicyKey]ProviderAggregate),
		manifests:      make(map[string]Manifest),
	}
}

// AppendCharge saves a charge record.
func (m *MemoryStore) AppendCharge(accountID string, record ChargeRecord) {
	m.mu.Lock()
	defer m.mu.Unlock()
	record.RecordedAt = time.Now().UTC()
	m.charges[accountID] = append(m.charges[accountID], record)
}

// AddToAggregate increments the aggregate totals for a policy tier.
func (m *MemoryStore) AddToAggregate(accountID string, key PolicyKey, usage WorkloadUsage, components map[string]float64, total float64, currency string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.aggregates[accountID]; !ok {
		m.aggregates[accountID] = make(map[PolicyKey]*Aggregate)
	}
	agg, ok := m.aggregates[accountID][key]
	if !ok {
		agg = &Aggregate{Components: make(map[string]float64), Currency: currency}
		m.aggregates[accountID][key] = agg
	}
	agg.Usage.CPUHours += usage.CPUHours
	agg.Usage.StorageGB += usage.StorageGB
	agg.Usage.EgressGB += usage.EgressGB
	for k, v := range components {
		agg.Components[k] += v
	}
	agg.Total += total
	agg.Currency = currency
}

// AggregatesForAccount returns a copy of the aggregates for the account.
func (m *MemoryStore) AggregatesForAccount(accountID string) map[PolicyKey]Aggregate {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make(map[PolicyKey]Aggregate)
	if aggs, ok := m.aggregates[accountID]; ok {
		for k, v := range aggs {
			copyComponents := make(map[string]float64, len(v.Components))
			for cKey, cVal := range v.Components {
				copyComponents[cKey] = cVal
			}
			res[k] = Aggregate{
				Usage: WorkloadUsage{
					CPUHours:  v.Usage.CPUHours,
					StorageGB: v.Usage.StorageGB,
					EgressGB:  v.Usage.EgressGB,
				},
				Components: copyComponents,
				Total:      v.Total,
				Currency:   v.Currency,
			}
		}
	}
	return res
}

// SaveManifest caches the latest manifest per account.
func (m *MemoryStore) SaveManifest(manifest Manifest) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.manifests[manifest.AccountID] = manifest
}

// LatestManifest returns the cached manifest if one exists.
func (m *MemoryStore) LatestManifest(accountID string) (Manifest, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	manifest, ok := m.manifests[accountID]
	return manifest, ok
}

// SaveProviderUsage stores provider reported data.
func (m *MemoryStore) SaveProviderUsage(accountID string, key PolicyKey, report ProviderAggregate) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.providerTotals[accountID]; !ok {
		m.providerTotals[accountID] = make(map[PolicyKey]ProviderAggregate)
	}
	m.providerTotals[accountID][key] = report
}

// ProviderUsage returns provider data for the account.
func (m *MemoryStore) ProviderUsage(accountID string) map[PolicyKey]ProviderAggregate {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make(map[PolicyKey]ProviderAggregate)
	if items, ok := m.providerTotals[accountID]; ok {
		for key, val := range items {
			res[key] = val
		}
	}
	return res
}
