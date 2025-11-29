package telemetry

import (
	"sync"
)

// ConflictTracker interface defines how conflicts are recorded.
type ConflictTracker interface {
	RecordConflict(tenantID string, count int)
	GetConflictRate(tenantID string) float64
}

// InMemoryConflictTracker is a simple in-memory implementation for rollout prep.
type InMemoryConflictTracker struct {
	mu           sync.RWMutex
	conflicts    map[string]int
	totalWrites  map[string]int
}

// NewInMemoryConflictTracker creates a new tracker.
func NewInMemoryConflictTracker() *InMemoryConflictTracker {
	return &InMemoryConflictTracker{
		conflicts:   make(map[string]int),
		totalWrites: make(map[string]int),
	}
}

// RecordConflict increments the conflict count for a tenant.
func (t *InMemoryConflictTracker) RecordConflict(tenantID string, count int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.conflicts[tenantID] += count
}

// RecordWrite increments the total write count for a tenant.
func (t *InMemoryConflictTracker) RecordWrite(tenantID string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.totalWrites[tenantID]++
}

// GetConflictRate calculates the conflict rate (conflicts / totalWrites).
func (t *InMemoryConflictTracker) GetConflictRate(tenantID string) float64 {
	t.mu.RLock()
	defer t.mu.RUnlock()

	total := t.totalWrites[tenantID]
	if total == 0 {
		return 0.0
	}
	conflicts := t.conflicts[tenantID]
	return float64(conflicts) / float64(total)
}
