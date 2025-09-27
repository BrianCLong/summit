package ccmo

import (
	"fmt"
	"sync"
	"time"
)

// FrequencyCap defines the allowed volume per duration for a channel.
type FrequencyCap struct {
	MaxMessages int           `json:"maxMessages"`
	Period      time.Duration `json:"-"`
}

// MarshalJSON customises JSON encoding so Period is expressed in seconds.
func (f FrequencyCap) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf(`{"maxMessages":%d,"periodSeconds":%d}`, f.MaxMessages, int64(f.Period/time.Second))), nil
}

// FrequencyTracker tracks send events for enforcing caps.
type FrequencyTracker struct {
	mu      sync.Mutex
	history map[string][]time.Time
}

// NewFrequencyTracker constructs an empty FrequencyTracker.
func NewFrequencyTracker() *FrequencyTracker {
	return &FrequencyTracker{history: make(map[string][]time.Time)}
}

// Allow returns true if the request can proceed under the provided cap.
func (t *FrequencyTracker) Allow(key string, cap FrequencyCap, now time.Time) bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	entries := t.history[key]
	cutoff := now.Add(-cap.Period)
	filtered := entries[:0]
	for _, ts := range entries {
		if ts.After(cutoff) {
			filtered = append(filtered, ts)
		}
	}
	if len(filtered) >= cap.MaxMessages {
		t.history[key] = filtered
		return false
	}
	filtered = append(filtered, now)
	t.history[key] = filtered
	return true
}
