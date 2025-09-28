package pac

import (
	"container/list"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"hash/crc32"
	"sort"
	"strings"
	"sync"
	"time"
)

// CacheKey represents the unique identity of a cached resource scoped by
// subject and policy information.
type CacheKey struct {
	ResourceID   string
	Tenant       string
	SubjectClass string
	PolicyHash   string
	Locale       string
}

// String renders the key into the canonical form shared with the TypeScript SDK.
func (k CacheKey) String() string {
	parts := []string{k.ResourceID, k.Tenant, k.SubjectClass, k.PolicyHash, k.Locale}
	for i, part := range parts {
		parts[i] = escape(part)
	}
	return strings.Join(parts, "|")
}

// escape ensures delimiter safe key encoding.
func escape(value string) string {
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, "|", "\\|")
	return value
}

// ParseCacheKey parses a serialized cache key string.
func ParseCacheKey(serialized string) (CacheKey, error) {
	if serialized == "" {
		return CacheKey{}, errors.New("empty cache key")
	}
	var (
		parts   []string
		current strings.Builder
		escape  bool
	)
	for _, r := range serialized {
		if escape {
			current.WriteRune(r)
			escape = false
			continue
		}
		if r == '\\' {
			escape = true
			continue
		}
		if r == '|' {
			parts = append(parts, current.String())
			current.Reset()
			continue
		}
		current.WriteRune(r)
	}
	parts = append(parts, current.String())
	if len(parts) != 5 {
		return CacheKey{}, fmt.Errorf("unexpected cache key segment count: %d", len(parts))
	}
	return CacheKey{
		ResourceID:   parts[0],
		Tenant:       parts[1],
		SubjectClass: parts[2],
		PolicyHash:   parts[3],
		Locale:       parts[4],
	}, nil
}

// EntryOptions customises how entries are stored in the cache.
type EntryOptions struct {
	TTL           time.Duration
	Jurisdiction  string
	ManifestExtra map[string]string
}

// PurgeCriteria describes which cached entries should be considered for removal.
type PurgeCriteria struct {
	PolicyHashes   []string
	SubjectClasses []string
	Jurisdictions  []string
	Keys           []CacheKey
}

// PurgeReport summarises the result of a purge (or dry-run purge).
type PurgeReport struct {
	DryRun    bool
	Count     int
	Keys      []CacheKey
	Manifests []Manifest
}

// Cache is a policy-aware edge cache implementation with LRU+TTL eviction.
type Cache struct {
	mu         sync.RWMutex
	capacity   int
	defaultTTL time.Duration
	items      map[string]*list.Element
	order      *list.List
	signer     ManifestSigner
	clock      Clock
}

type cacheItem struct {
	key          CacheKey
	value        []byte
	expiresAt    time.Time
	manifest     Manifest
	jurisdiction string
}

// Clock abstracts time access for deterministic testing.
type Clock interface {
	Now() time.Time
}

type realClock struct{}

func (realClock) Now() time.Time { return time.Now().UTC() }

// CacheOption configures cache behaviour.
type CacheOption func(*Cache)

// WithClock overrides the cache clock (used in tests).
func WithClock(clock Clock) CacheOption {
	return func(c *Cache) {
		if clock != nil {
			c.clock = clock
		}
	}
}

// NewCache constructs a cache with the provided capacity and default TTL.
func NewCache(capacity int, defaultTTL time.Duration, signer ManifestSigner, opts ...CacheOption) (*Cache, error) {
	if capacity <= 0 {
		return nil, errors.New("capacity must be positive")
	}
	if defaultTTL <= 0 {
		return nil, errors.New("default TTL must be positive")
	}
	if signer == nil {
		return nil, errors.New("manifest signer is required")
	}
	cache := &Cache{
		capacity:   capacity,
		defaultTTL: defaultTTL,
		items:      make(map[string]*list.Element, capacity),
		order:      list.New(),
		signer:     signer,
		clock:      realClock{},
	}
	for _, opt := range opts {
		opt(cache)
	}
	return cache, nil
}

// Set adds or replaces a cache value under the specified key.
func (c *Cache) Set(key CacheKey, value []byte, options EntryOptions) (Manifest, error) {
	if c == nil {
		return Manifest{}, errors.New("cache is nil")
	}
	if value == nil {
		return Manifest{}, errors.New("value cannot be nil")
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	c.pruneExpiredLocked()

	ttl := options.TTL
	if ttl <= 0 {
		ttl = c.defaultTTL
	}
	now := c.clock.Now()
	expiresAt := now.Add(ttl)

	checksum := crc32.ChecksumIEEE(value)
	ttlSeconds := int64(ttl / time.Second)
	if ttlSeconds == 0 && ttl > 0 {
		ttlSeconds = 1
	}
	payload := manifestPayload{
		Key:           key.String(),
		ResourceID:    key.ResourceID,
		Tenant:        key.Tenant,
		SubjectClass:  key.SubjectClass,
		PolicyHash:    key.PolicyHash,
		Locale:        key.Locale,
		Jurisdiction:  options.Jurisdiction,
		CreatedAt:     now,
		ExpiresAt:     expiresAt,
		TTLSeconds:    ttlSeconds,
		ValueChecksum: encodeChecksum(checksum),
		ManifestExtra: options.ManifestExtra,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return Manifest{}, fmt.Errorf("marshal manifest payload: %w", err)
	}

	signature, err := c.signer.Sign(payloadBytes)
	if err != nil {
		return Manifest{}, fmt.Errorf("sign manifest: %w", err)
	}

	manifest := ManifestFromPayload(payload, signature)

	if element, ok := c.items[manifest.Key]; ok {
		item := element.Value.(*cacheItem)
		item.value = cloneBytes(value)
		item.expiresAt = expiresAt
		item.manifest = manifest
		item.jurisdiction = options.Jurisdiction
		c.order.MoveToFront(element)
		return manifest, nil
	}

	item := &cacheItem{
		key:          key,
		value:        cloneBytes(value),
		expiresAt:    expiresAt,
		manifest:     manifest,
		jurisdiction: options.Jurisdiction,
	}
	element := c.order.PushFront(item)
	c.items[manifest.Key] = element

	if c.order.Len() > c.capacity {
		c.evictOldestLocked()
	}

	return manifest, nil
}

// Get retrieves a cached value and manifest if present and not expired.
func (c *Cache) Get(key CacheKey) ([]byte, Manifest, bool) {
	if c == nil {
		return nil, Manifest{}, false
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	c.pruneExpiredLocked()

	serialized := key.String()
	element, ok := c.items[serialized]
	if !ok {
		return nil, Manifest{}, false
	}

	item := element.Value.(*cacheItem)
	if c.clock.Now().After(item.expiresAt) {
		c.removeElementLocked(element)
		return nil, Manifest{}, false
	}

	c.order.MoveToFront(element)
	return cloneBytes(item.value), item.manifest, true
}

// Purge removes entries matching the provided criteria. When dryRun is true the
// matching keys are reported without removal.
func (c *Cache) Purge(criteria PurgeCriteria, dryRun bool) PurgeReport {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.pruneExpiredLocked()

	matches := c.collectMatchesLocked(criteria)

	report := PurgeReport{
		DryRun:    dryRun,
		Count:     len(matches),
		Keys:      make([]CacheKey, 0, len(matches)),
		Manifests: make([]Manifest, 0, len(matches)),
	}

	for _, element := range matches {
		item := element.Value.(*cacheItem)
		report.Keys = append(report.Keys, item.key)
		report.Manifests = append(report.Manifests, item.manifest)
	}

	if dryRun {
		return report
	}

	for _, element := range matches {
		c.removeElementLocked(element)
	}

	return report
}

// pruneExpiredLocked removes expired entries.
func (c *Cache) pruneExpiredLocked() {
	now := c.clock.Now()
	for key, element := range c.items {
		item := element.Value.(*cacheItem)
		if now.After(item.expiresAt) {
			c.removeElementLocked(element)
			delete(c.items, key)
		}
	}
}

func (c *Cache) collectMatchesLocked(criteria PurgeCriteria) []*list.Element {
	if len(criteria.PolicyHashes) == 0 && len(criteria.SubjectClasses) == 0 && len(criteria.Jurisdictions) == 0 && len(criteria.Keys) == 0 {
		return nil
	}

	policyMatch := makeSet(criteria.PolicyHashes)
	subjectMatch := makeSet(criteria.SubjectClasses)
	jurisdictionMatch := makeSet(criteria.Jurisdictions)
	keyMatch := make(map[string]struct{}, len(criteria.Keys))
	for _, key := range criteria.Keys {
		keyMatch[key.String()] = struct{}{}
	}

	matches := make([]*list.Element, 0)
	for serialized, element := range c.items {
		if len(keyMatch) > 0 {
			if _, ok := keyMatch[serialized]; !ok {
				continue
			}
		}
		item := element.Value.(*cacheItem)
		if len(policyMatch) > 0 {
			if _, ok := policyMatch[item.key.PolicyHash]; !ok {
				continue
			}
		}
		if len(subjectMatch) > 0 {
			if _, ok := subjectMatch[item.key.SubjectClass]; !ok {
				continue
			}
		}
		if len(jurisdictionMatch) > 0 {
			if _, ok := jurisdictionMatch[item.jurisdiction]; !ok {
				continue
			}
		}
		matches = append(matches, element)
	}
	sort.SliceStable(matches, func(i, j int) bool {
		mi := matches[i].Value.(*cacheItem)
		mj := matches[j].Value.(*cacheItem)
		return mi.manifest.Key < mj.manifest.Key
	})
	return matches
}

func makeSet(values []string) map[string]struct{} {
	if len(values) == 0 {
		return nil
	}
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		if value == "" {
			continue
		}
		set[value] = struct{}{}
	}
	return set
}

func (c *Cache) evictOldestLocked() {
	element := c.order.Back()
	if element == nil {
		return
	}
	c.removeElementLocked(element)
}

func (c *Cache) removeElementLocked(element *list.Element) {
	c.order.Remove(element)
	item := element.Value.(*cacheItem)
	delete(c.items, item.manifest.Key)
}

func cloneBytes(src []byte) []byte {
	dst := make([]byte, len(src))
	copy(dst, src)
	return dst
}

func encodeChecksum(checksum uint32) string {
	buf := make([]byte, 4)
	buf[0] = byte(checksum >> 24)
	buf[1] = byte(checksum >> 16)
	buf[2] = byte(checksum >> 8)
	buf[3] = byte(checksum)
	return base64.StdEncoding.EncodeToString(buf)
}
