package featurestore

import (
	"sync"
	"time"
)

// Snapshot represents the captured state of feature values for an inference event.
type Snapshot struct {
	Timestamp time.Time
	Features  map[string]float64
}

// Snapshotter stores feature snapshots in-memory for subsequent audits. It retains up to
// the configured capacity using a FIFO eviction strategy. The implementation is thread
// safe and cheap enough for unit tests and lightweight daemons.
type Snapshotter struct {
	mu       sync.RWMutex
	capacity int
	entries  []Snapshot
}

// NewSnapshotter returns a snapshotter with the provided capacity. When capacity is zero
// or negative the snapshotter behaves as if it had unlimited capacity.
func NewSnapshotter(capacity int) *Snapshotter {
	return &Snapshotter{capacity: capacity}
}

// Record persists the provided features using the supplied timestamp.
func (s *Snapshotter) Record(ts time.Time, features map[string]float64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	copyFeatures := make(map[string]float64, len(features))
	for k, v := range features {
		copyFeatures[k] = v
	}
	snapshot := Snapshot{Timestamp: ts, Features: copyFeatures}
	s.entries = append(s.entries, snapshot)
	if s.capacity > 0 && len(s.entries) > s.capacity {
		s.entries = s.entries[len(s.entries)-s.capacity:]
	}
}

// All returns all retained snapshots in chronological order.
func (s *Snapshotter) All() []Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Snapshot, len(s.entries))
	copy(out, s.entries)
	return out
}
