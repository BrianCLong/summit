# Cache Layer Enhancements

This cache module provides tiered caching (in-memory + Redis), deterministic cache key construction, stale-while-revalidate support, rate limiting, and resilience helpers.

- **Deterministic keys** via `cacheKeyBuilder.ts` keep cache namespaces consistent while hiding sensitive parts of the key.
- **Stale-while-revalidate** in `responseCache.ts` serves warm data and refreshes asynchronously with per-key dogpile protection.
- **Tag-based invalidation** is supported through `invalidateTags` and Redis set indexes (`idx:tag:<name>`), with local cache flushing on broadcast.
- **Reliability primitives**: token bucket rate limiter, circuit breaker, and safe fallback wrapper live alongside cache utilities.
- **Benchmarks**: `bench/key-builder-bench.ts` provides a repeatable micro-benchmark for key hashing overhead.

Run cache-focused tests with:

```bash
pnpm --filter server test -- --runTestsByPath server/src/cache/__tests__/responseCache.test.ts server/src/cache/__tests__/cacheLayer.test.ts server/src/cache/__tests__/resilience.test.ts
```
