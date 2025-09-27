package pac

import (
	"testing"
	"time"
)

type fakeClock struct {
	now time.Time
}

func newFakeClock(start time.Time) *fakeClock {
	return &fakeClock{now: start}
}

func (f *fakeClock) Now() time.Time {
	return f.now
}

func (f *fakeClock) Advance(d time.Duration) {
	f.now = f.now.Add(d)
}

func newTestCache(t *testing.T, clock Clock) *Cache {
	t.Helper()
	signer, err := NewHMACSigner([]byte("secret"))
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}
	cache, err := NewCache(3, time.Minute, signer, WithClock(clock))
	if err != nil {
		t.Fatalf("failed to create cache: %v", err)
	}
	return cache
}

func TestCacheHitWithIdenticalInputs(t *testing.T) {
	clock := newFakeClock(time.Unix(0, 0).UTC())
	cache := newTestCache(t, clock)

	key := CacheKey{
		ResourceID:   "doc-1",
		Tenant:       "tenant-a",
		SubjectClass: "user",
		PolicyHash:   "policy-abc",
		Locale:       "en-US",
	}

	manifest, err := cache.Set(key, []byte("payload"), EntryOptions{Jurisdiction: "us-ca"})
	if err != nil {
		t.Fatalf("set failed: %v", err)
	}
	if !manifest.Verify(cache.signer) {
		t.Fatalf("manifest signature invalid")
	}

	value, cachedManifest, ok := cache.Get(key)
	if !ok {
		t.Fatalf("expected cache hit")
	}
	if string(value) != "payload" {
		t.Fatalf("unexpected payload: %s", value)
	}
	if cachedManifest.Signature != manifest.Signature {
		t.Fatalf("expected manifest reuse on cache hit")
	}
}

func TestTTLExpiryRemovesEntry(t *testing.T) {
	start := time.Unix(100, 0).UTC()
	clock := newFakeClock(start)
	cache := newTestCache(t, clock)

	key := CacheKey{ResourceID: "resource", Tenant: "tenant", SubjectClass: "role", PolicyHash: "hash", Locale: "en"}
	_, err := cache.Set(key, []byte("value"), EntryOptions{TTL: 5 * time.Second, Jurisdiction: "us"})
	if err != nil {
		t.Fatalf("set failed: %v", err)
	}

	clock.Advance(6 * time.Second)

	if _, _, ok := cache.Get(key); ok {
		t.Fatalf("expected entry to expire")
	}
}

func TestLRUEvictionRespectsRecentAccess(t *testing.T) {
	clock := newFakeClock(time.Unix(0, 0).UTC())
	signer, err := NewHMACSigner([]byte("secret"))
	if err != nil {
		t.Fatalf("signer create: %v", err)
	}
	cache, err := NewCache(2, time.Minute, signer, WithClock(clock))
	if err != nil {
		t.Fatalf("cache create: %v", err)
	}

	keyA := CacheKey{ResourceID: "A", Tenant: "t", SubjectClass: "user", PolicyHash: "p1", Locale: "en"}
	keyB := CacheKey{ResourceID: "B", Tenant: "t", SubjectClass: "user", PolicyHash: "p1", Locale: "en"}
	keyC := CacheKey{ResourceID: "C", Tenant: "t", SubjectClass: "user", PolicyHash: "p1", Locale: "en"}

	if _, err := cache.Set(keyA, []byte("A"), EntryOptions{}); err != nil {
		t.Fatalf("set A: %v", err)
	}
	if _, err := cache.Set(keyB, []byte("B"), EntryOptions{}); err != nil {
		t.Fatalf("set B: %v", err)
	}

	if _, _, ok := cache.Get(keyA); !ok {
		t.Fatalf("expected hit for A")
	}

	if _, err := cache.Set(keyC, []byte("C"), EntryOptions{}); err != nil {
		t.Fatalf("set C: %v", err)
	}

	if _, _, ok := cache.Get(keyA); !ok {
		t.Fatalf("expected A retained")
	}
	if _, _, ok := cache.Get(keyC); !ok {
		t.Fatalf("expected C present")
	}
	if _, _, ok := cache.Get(keyB); ok {
		t.Fatalf("expected B evicted")
	}
}

func TestPurgeByPolicyHash(t *testing.T) {
	clock := newFakeClock(time.Unix(0, 0).UTC())
	cache := newTestCache(t, clock)

	keyMatch := CacheKey{ResourceID: "1", Tenant: "tenant", SubjectClass: "user", PolicyHash: "policy-1", Locale: "en"}
	keyOther := CacheKey{ResourceID: "2", Tenant: "tenant", SubjectClass: "user", PolicyHash: "policy-2", Locale: "en"}

	if _, err := cache.Set(keyMatch, []byte("match"), EntryOptions{Jurisdiction: "us"}); err != nil {
		t.Fatalf("set match: %v", err)
	}
	if _, err := cache.Set(keyOther, []byte("other"), EntryOptions{Jurisdiction: "eu"}); err != nil {
		t.Fatalf("set other: %v", err)
	}

	report := cache.Purge(PurgeCriteria{PolicyHashes: []string{"policy-1"}}, false)
	if report.Count != 1 {
		t.Fatalf("expected 1 purge, got %d", report.Count)
	}
	if len(report.Keys) != 1 || report.Keys[0] != keyMatch {
		t.Fatalf("unexpected keys purged: %+v", report.Keys)
	}

	if _, _, ok := cache.Get(keyMatch); ok {
		t.Fatalf("expected match to be removed")
	}
	if _, _, ok := cache.Get(keyOther); !ok {
		t.Fatalf("expected other to remain")
	}
}

func TestDryRunMatchesLivePurge(t *testing.T) {
	clock := newFakeClock(time.Unix(0, 0).UTC())
	cache := newTestCache(t, clock)

	keys := []CacheKey{
		{ResourceID: "doc1", Tenant: "tenant", SubjectClass: "user", PolicyHash: "p1", Locale: "en"},
		{ResourceID: "doc2", Tenant: "tenant", SubjectClass: "user", PolicyHash: "p1", Locale: "en"},
		{ResourceID: "doc3", Tenant: "tenant", SubjectClass: "service", PolicyHash: "p2", Locale: "en"},
	}

	jurisdictions := []string{"us", "us", "eu"}

	for i, key := range keys {
		if _, err := cache.Set(key, []byte(key.ResourceID), EntryOptions{Jurisdiction: jurisdictions[i]}); err != nil {
			t.Fatalf("set %s: %v", key.ResourceID, err)
		}
	}

	criteria := PurgeCriteria{PolicyHashes: []string{"p1"}, Jurisdictions: []string{"us"}}

	dryRun := cache.Purge(criteria, true)
	if !dryRun.DryRun {
		t.Fatalf("expected dry run flag")
	}

	live := cache.Purge(criteria, false)
	if live.DryRun {
		t.Fatalf("expected live purge")
	}

	if dryRun.Count != live.Count {
		t.Fatalf("dry run count %d, live count %d", dryRun.Count, live.Count)
	}
	if len(dryRun.Keys) != len(live.Keys) {
		t.Fatalf("dry run keys %d, live keys %d", len(dryRun.Keys), len(live.Keys))
	}

	for i, key := range dryRun.Keys {
		if key != live.Keys[i] {
			t.Fatalf("mismatched key at %d: %v vs %v", i, key, live.Keys[i])
		}
	}

	for _, key := range dryRun.Keys {
		if _, _, ok := cache.Get(key); ok {
			t.Fatalf("expected key %v to be purged", key)
		}
	}
}
