package policy

import (
	"sync"
	"time"
)

// TokenBucket implements a byte-based token bucket limiter.
type TokenBucket struct {
	capacity int64
	rate     int64
	mu       sync.Mutex
	tokens   float64
	last     time.Time
}

// NewTokenBucket creates a limiter with the desired throughput.
func NewTokenBucket(bytesPerSecond, burstBytes int64) *TokenBucket {
	if bytesPerSecond <= 0 {
		bytesPerSecond = 1
	}
	if burstBytes <= 0 {
		burstBytes = bytesPerSecond
	}
	return &TokenBucket{
		capacity: burstBytes,
		rate:     bytesPerSecond,
		tokens:   float64(burstBytes),
		last:     time.Now(),
	}
}

// Allow consumes tokens if available for the requested bytes.
func (t *TokenBucket) Allow(bytes int64) bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(t.last).Seconds()
	if elapsed > 0 {
		t.tokens += float64(t.rate) * elapsed
		if t.tokens > float64(t.capacity) {
			t.tokens = float64(t.capacity)
		}
		t.last = now
	}

	if float64(bytes) > t.tokens {
		return false
	}

	t.tokens -= float64(bytes)
	return true
}

// Reset restores the limiter to its full capacity.
func (t *TokenBucket) Reset() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.tokens = float64(t.capacity)
	t.last = time.Now()
}
