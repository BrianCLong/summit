package cache

import (
	"context"
	"sync"
	"time"

	"github.com/summit/jpr"
)

type loaderFn func(ctx context.Context) (*jpr.Engine, error)

type cachedEngine struct {
	engine     *jpr.Engine
	expiresAt  time.Time
	lastAccess time.Time
}

// EngineCache caches compiled engines using TTL and ETag semantics.
type EngineCache struct {
	mu      sync.RWMutex
	entries map[string]cachedEngine
}

// New creates an empty EngineCache.
func New() *EngineCache {
	return &EngineCache{entries: make(map[string]cachedEngine)}
}

// GetOrLoad returns the cached engine for the provided etag or loads it using the loader.
func (c *EngineCache) GetOrLoad(ctx context.Context, etag string, ttl time.Duration, loader loaderFn) (*jpr.Engine, bool, error) {
	now := time.Now().UTC()
	c.mu.RLock()
	entry, ok := c.entries[etag]
	c.mu.RUnlock()

	if ok && entry.expiresAt.After(now) {
		entry.lastAccess = now
		c.mu.Lock()
		c.entries[etag] = entry
		c.mu.Unlock()
		return entry.engine, true, nil
	}

	engine, err := loader(ctx)
	if err != nil {
		return nil, false, err
	}

	c.mu.Lock()
	c.entries[etag] = cachedEngine{
		engine:     engine,
		expiresAt:  now.Add(ttl),
		lastAccess: now,
	}
	c.mu.Unlock()
	return engine, false, nil
}

// Sweep removes expired cache entries and returns the number evicted.
func (c *EngineCache) Sweep(now time.Time) int {
	c.mu.Lock()
	defer c.mu.Unlock()
	count := 0
	for etag, entry := range c.entries {
		if !entry.expiresAt.After(now) {
			delete(c.entries, etag)
			count++
		}
	}
	return count
}

// Len returns the number of cached entries.
func (c *EngineCache) Len() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.entries)
}
