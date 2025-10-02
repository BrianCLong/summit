package manifest

import (
	"fmt"
	"math"
	"sync"
)

// Store keeps manifests in-memory for quick retrieval and reconciliation.
type Store struct {
	mu        sync.RWMutex
	manifests map[string]*Record
}

// NewStore creates an empty manifest store.
func NewStore() *Store {
	return &Store{manifests: make(map[string]*Record)}
}

// Save persists a manifest in the store.
func (s *Store) Save(record *Record) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.manifests[record.ManifestID] = record
}

// Get retrieves a manifest by identifier.
func (s *Store) Get(id string) (*Record, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.manifests[id]
	return record, ok
}

// Reconcile compares the manifest details with provider reported figures.
func (s *Store) Reconcile(id string, providerBytes int64, providerCost float64) (*Record, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.manifests[id]
	if !ok {
		return nil, fmt.Errorf("manifest %s not found", id)
	}

	if record.Reconciled {
		return record, nil
	}

	if record.Bytes != providerBytes {
		return nil, fmt.Errorf("byte mismatch: manifest=%d provider=%d", record.Bytes, providerBytes)
	}

	if math.Abs(record.Cost-providerCost) > 0.01 {
		return nil, fmt.Errorf("cost mismatch: manifest=%.4f provider=%.4f", record.Cost, providerCost)
	}

	record.Reconciled = true
	record.ProviderBytes = providerBytes
	record.ProviderCost = providerCost
	return record, nil
}

// All returns a snapshot of stored manifests.
func (s *Store) All() []*Record {
	s.mu.RLock()
	defer s.mu.RUnlock()
	records := make([]*Record, 0, len(s.manifests))
	for _, record := range s.manifests {
		records = append(records, record)
	}
	return records
}
