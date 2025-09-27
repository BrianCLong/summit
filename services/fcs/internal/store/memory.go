package store

import (
	"context"
	"errors"
	"sync"

	"example.com/summit/fcs/internal/model"
)

// MemoryStore is an in-memory implementation of Store used for testing and default deployments.
type MemoryStore struct {
	kind    model.StoreKind
	mu      sync.RWMutex
	records map[string]model.StoredCanary
}

// NewMemoryStore creates a memory backed store for the provided kind.
func NewMemoryStore(kind model.StoreKind) *MemoryStore {
	return &MemoryStore{
		kind:    kind,
		records: make(map[string]model.StoredCanary),
	}
}

// Type returns the store kind supported by this memory store.
func (m *MemoryStore) Type() model.StoreKind {
	return m.kind
}

// Put stores the provided canary, ensuring the store kind matches expectations.
func (m *MemoryStore) Put(_ context.Context, canary model.StoredCanary) error {
	if canary.Store != m.kind {
		return errors.New("store kind mismatch for canary placement")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.records[canary.Record.ID] = canary
	return nil
}

// List returns all canaries held by the store.
func (m *MemoryStore) List(context.Context) ([]model.StoredCanary, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]model.StoredCanary, 0, len(m.records))
	for _, c := range m.records {
		out = append(out, c)
	}
	return out, nil
}
