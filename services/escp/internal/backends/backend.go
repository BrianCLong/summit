package backends

import (
	"errors"
	"sort"
	"sync"
)

// Record represents a single subject-scoped entry managed by a backend.
type Record struct {
	Key     string
	Subject string
	Value   string
}

// Backend defines the operations required by erasure agents.
type Backend interface {
	ListKeys(subject string) ([]Record, error)
	DeleteKeys(keys []string) error
}

// InMemoryBackend is a thread-safe backend used for testing and default deployments.
type InMemoryBackend struct {
	mu      sync.RWMutex
	records map[string]Record
}

// NewInMemoryBackend constructs an in-memory backend seeded with the provided records.
func NewInMemoryBackend(records []Record) *InMemoryBackend {
	store := make(map[string]Record, len(records))
	for _, r := range records {
		store[r.Key] = r
	}
	return &InMemoryBackend{records: store}
}

// ListKeys returns all records that belong to the provided subject.
func (b *InMemoryBackend) ListKeys(subject string) ([]Record, error) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	var filtered []Record
	for _, r := range b.records {
		if r.Subject == subject {
			filtered = append(filtered, r)
		}
	}
	sort.Slice(filtered, func(i, j int) bool { return filtered[i].Key < filtered[j].Key })
	return filtered, nil
}

// DeleteKeys removes the provided keys from the backend.
func (b *InMemoryBackend) DeleteKeys(keys []string) error {
	if len(keys) == 0 {
		return nil
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, key := range keys {
		if _, ok := b.records[key]; !ok {
			return errors.New("attempted to delete key that does not exist: " + key)
		}
		delete(b.records, key)
	}
	return nil
}

// Snapshot returns all records currently stored in the backend.
func (b *InMemoryBackend) Snapshot() []Record {
	b.mu.RLock()
	defer b.mu.RUnlock()
	out := make([]Record, 0, len(b.records))
	for _, r := range b.records {
		out = append(out, r)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Key < out[j].Key })
	return out
}
