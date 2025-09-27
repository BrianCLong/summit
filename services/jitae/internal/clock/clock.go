package clock

import (
	"sync"
	"time"
)

// Clock abstracts time for deterministic testing.
type Clock interface {
	Now() time.Time
}

// RealClock implements Clock using the system clock.
type RealClock struct{}

// Now returns the current UTC time.
func (RealClock) Now() time.Time {
	return time.Now().UTC()
}

// ManualClock is a controllable clock primarily for tests.
type ManualClock struct {
	mu  sync.RWMutex
	now time.Time
}

// NewManualClock creates a manual clock starting at the supplied time.
func NewManualClock(start time.Time) *ManualClock {
	return &ManualClock{now: start}
}

// Now returns the current manual time.
func (m *ManualClock) Now() time.Time {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.now
}

// Advance moves the manual clock forward by the provided duration.
func (m *ManualClock) Advance(d time.Duration) {
	if d < 0 {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.now = m.now.Add(d)
}

// Set sets the manual clock to the provided timestamp.
func (m *ManualClock) Set(t time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.now = t
}
