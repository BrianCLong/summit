package canary

import "sync"

// Gate controls when the sentinel is allowed to evaluate and alert on drift metrics.
// It enforces a warmup period to accumulate baseline statistics before triggering any
// downstream automation.
type Gate struct {
	mu           sync.RWMutex
	warmupEvents int
	processed    int
	enabled      bool
}

// NewGate constructs a gate with the supplied warmup configuration. If warmupEvents is
// zero the gate will immediately allow traffic through.
func NewGate(warmupEvents int) *Gate {
	return &Gate{warmupEvents: warmupEvents, enabled: true}
}

// SetEnabled toggles the canary gate at runtime.
func (g *Gate) SetEnabled(v bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.enabled = v
}

// Enabled returns the current enabled state.
func (g *Gate) Enabled() bool {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.enabled
}

// Track increments the processed counter. It is safe to call multiple times even when
// the gate is disabled so that the warmup count continues accumulating.
func (g *Gate) Track() {
	g.mu.Lock()
	g.processed++
	g.mu.Unlock()
}

// Ready indicates whether the gate has observed enough traffic to allow drift detection.
func (g *Gate) Ready() bool {
	g.mu.RLock()
	defer g.mu.RUnlock()
	if !g.enabled {
		return false
	}
	return g.processed >= g.warmupEvents
}

// WarmupRemaining returns the number of events still required before the gate opens.
func (g *Gate) WarmupRemaining() int {
	g.mu.RLock()
	defer g.mu.RUnlock()
	remaining := g.warmupEvents - g.processed
	if remaining < 0 {
		return 0
	}
	return remaining
}
