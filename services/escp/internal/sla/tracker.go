package sla

import "sync"

// Metrics captures aggregate latency data for a single system.
type Metrics struct {
	Count int     `json:"count"`
	Total float64 `json:"totalMillis"`
	Max   float64 `json:"maxMillis"`
}

// Tracker records per-system latencies across agent executions.
type Tracker struct {
	mu      sync.RWMutex
	metrics map[string]*Metrics
}

// NewTracker creates an empty SLA tracker.
func NewTracker() *Tracker {
	return &Tracker{metrics: make(map[string]*Metrics)}
}

// Record appends a latency measurement for the provided system.
func (t *Tracker) Record(system string, millis float64) {
	t.mu.Lock()
	defer t.mu.Unlock()
	entry, ok := t.metrics[system]
	if !ok {
		entry = &Metrics{}
		t.metrics[system] = entry
	}
	entry.Count++
	entry.Total += millis
	if millis > entry.Max {
		entry.Max = millis
	}
}

// Report returns a snapshot of the metrics collected to date.
func (t *Tracker) Report() map[string]Metrics {
	t.mu.RLock()
	defer t.mu.RUnlock()
	out := make(map[string]Metrics, len(t.metrics))
	for k, v := range t.metrics {
		out[k] = *v
	}
	return out
}
