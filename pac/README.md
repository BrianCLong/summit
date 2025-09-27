# Policy-Aware Edge Cache (PAC)

PAC provides a policy-scoped caching layer with subject-aware keys and targeted invalidation primitives.

## Features

- **Composite keys**: cache entries are keyed by resource, tenant, subject class, policy hash, and locale.
- **LRU + TTL eviction**: bounded memory usage with per-entry TTL overrides.
- **Signed manifests**: every cache write returns a signed manifest that can be verified by clients.
- **Policy-driven purge**: invalidate cached data by policy hash, subject class, jurisdiction, or explicit keys. Supports dry-run inspection before live purge.

## Usage

```go
signer, _ := pac.NewHMACSigner([]byte("secret"))
cache, _ := pac.NewCache(1024, time.Minute*5, signer)

key := pac.CacheKey{
    ResourceID:   "doc-1",
    Tenant:       "tenant-a",
    SubjectClass: "user",
    PolicyHash:   "policy-hash",
    Locale:       "en-US",
}
manifest, _ := cache.Set(key, []byte("payload"), pac.EntryOptions{Jurisdiction: "us-ca"})
value, manifest, ok := cache.Get(key)

report := cache.Purge(pac.PurgeCriteria{PolicyHashes: []string{"policy-hash"}}, true) // dry-run
```

See [`sdk/typescript`](../sdk/typescript) for the companion TypeScript SDK.

