# QUOTAS_V1 Control Plane

> **Scope**: Applies when `QUOTAS_V1=1`. Default behavior is unchanged when the flag is off.

## Features

- **Per-tenant budgets**
  - Requests per minute
  - Ingest bytes per day
  - Query cost per minute
  - Export concurrency
- **Adaptive throttling**
  - Saturation signals: CPU load, queue depth, DB latency
  - Lower-priority workloads are throttled first; VIP traffic is preserved
- **Burst credits**
  - Short-lived credits per window to absorb brief spikes
- **Admin overrides**
  - Per-tenant overrides for all quota windows and burst pools

## Configuration

1. Set the feature flag: `export QUOTAS_V1=1`.
2. Optional tenant-specific overrides (runtime, in-memory):
   ```ts
   quotaManager.setTenantOverrides("tenant-id", {
     requestsPerMinute: { limit: 200, windowMs: 60_000, burstCredits: 25 },
     ingestBytesPerDay: {
       limit: 10 * 1024 * 1024 * 1024,
       windowMs: 86_400_000,
       burstCredits: 512 * 1024 * 1024,
     },
     queryCostPerMinute: { limit: 20_000, windowMs: 60_000, burstCredits: 2_000 },
     exportConcurrency: { limit: 10, windowMs: 0, burstCredits: 2 },
   });
   ```

## Runtime behavior

- **Deterministic 429s**: Responses include `Retry-After` and a `reason` such as `requests_per_minute_exceeded`, `export_concurrency_exceeded`, `burst_exhausted`, or `saturation_throttle`.
- **Headers**: `X-Tenant-Quota-Limit`, `X-Tenant-Quota-Remaining`, and `Retry-After` are set when enforcement is active.
- **Adaptive throttling**: When saturation crosses thresholds, non-VIP workloads see reduced effective limits or outright throttling (low priority during critical saturation).
- **Burst credits**: Applied before rejection; once depleted, subsequent requests are rejected until the window resets.

## Metrics

Namespace: `quota_manager`

- Counters: `quota_checks_total{tenant_id,resource,result}`, `quota_throttles_total{tenant_id,resource,reason}`, `burst_credits_used_total{tenant_id,resource}`
- Gauges: `quota_remaining{tenant_id,resource}`, `saturation_cpu_load`, `saturation_queue_depth`, `saturation_db_latency_ms`, `saturation_level`

Use these to alert on sustained throttling per tenant/resource and to correlate with saturation indicators.

## Testing guidance

- **Unit**: window resets, burst credit consumption, saturation-driven throttling (see `server/src/lib/resources/__tests__/QuotaManager.v1.test.ts`).
- **Integration**: middleware respects QUOTAS_V1 flag and returns deterministic 429s with retry hints (see `server/src/middleware/__tests__/rateLimit.test.ts`).
