# Cache Policy

This document standardizes caching across the platform and defines how caches are configured, owned, and measured.

## Cache Classes

| Class             | Intent                                                           | Freshness                                                | Consistency                                                                 |
| ----------------- | ---------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `critical_path`   | Latency-sensitive user flows and blocking APIs.                  | Tight TTLs to avoid stale data; pre-warm where possible. | `stale-unacceptable` – callers must assume fallback if data is unavailable. |
| `best_effort`     | Opportunistic accelerators that should never change correctness. | Moderate TTLs tuned for cost/perf.                       | `stale-OK` – stale data is acceptable for short windows.                    |
| `static_metadata` | Rarely changing reference data and feature flags.                | Long TTLs with occasional refresh.                       | `stale-OK` – recompute in background when possible.                         |

### TTL Guidance

- `critical_path`: 30–300 seconds depending on mutation rate.
- `best_effort`: 5–30 minutes depending on cacheable payload size.
- `static_metadata`: 1–24 hours with periodic refresh jobs.

## Consistency Expectations

- `stale-unacceptable`: Reads must fall back to source of truth when cache is cold or expired; writes should invalidate or overwrite immediately.
- `stale-OK`: Callers tolerate a short window of stale data; writes should still set or invalidate the cache promptly, but reads can proceed when slightly old.

## Declaration Rules

All caches must be explicitly declared with:

- **Namespace/key pattern**: Describe the exact key shape (e.g., `answers:{tenant}:{hash}`, `citizen:national:{id}`).
- **TTL**: Match the class guidance above; document any deviations.
- **Owner**: Team/service responsible for cache stewardship and incident response.
- **Class**: One of `critical_path`, `best_effort`, or `static_metadata`.
- **Consistency**: `stale-OK` or `stale-unacceptable`.

## Environment-Aware Behavior

- **Production**: Prefer Redis/ElastiCache for consistency and shared state. Respect `CACHE_DISABLED=true` to route all calls to the source of truth during incidents.
- **Development/Test**: Fall back to the in-memory backend automatically when Redis is unavailable. TTLs may be shortened (e.g., 30–120 seconds) to keep feedback loops fast.
- **Failure Modes**: Cache failures must degrade gracefully—misses should simply re-fetch from the primary data source.

## Operational Controls

- **Disable switch**: `CACHE_DISABLED=true` turns off reads/writes while keeping code paths intact.
- **Metrics**: Track `cache_hits_total`, `cache_misses_total`, and `cache_evictions_total` labeled by namespace and class.
- **Reviews**: New caches should be reviewed for class, TTL, namespace, and ownership before merge.
