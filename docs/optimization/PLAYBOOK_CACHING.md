# Optimization Playbook: Caching Strategy

**Target Metrics:** `perf_api_p95`, `cost_hourly`
**Risk Profile:** Medium (Stale Data)

## 1. When to Apply

- API Latency P95 is > 200ms consistently.
- Database CPU usage is high > 60%.
- Request pattern is read-heavy (> 80% reads).

## 2. Implementation Steps

1.  **Identify Hot Routes**: Use Jaeger/Prometheus to find top 5 slowest read endpoints.
2.  **Enable Redis Cache**:
    - Use `CacheService` wrapper.
    - Set TTL appropriate for data freshness (e.g., 60s for reference data).
3.  **Verify Invalidation**: Ensure mutations to the underlying data trigger cache clearing.

## 3. Guardrails (MUST PASS)

- [ ] **Freshness**: Maximum stale time must be < Business Requirement (e.g., 5 min).
- [ ] **Consistency**: User-specific data must be keyed by `userId` or `tenantId` to prevent leaks.
- [ ] **Fallback**: If Redis is down, system must transparently fall back to DB.

## 4. Rollback

- Disable cache flag feature flag.
- Flush Redis keys for affected prefix.
