# Feed Processor Rate Limit Tuning Guide

The feed-processor service now enforces per-tenant and per-user ingestion limits using Redis-backed token buckets. This guide explains how to tune those limits, monitor enforcement, and understand the runtime defaults.

## How the limiter works

- **Token bucket model** – Every scope (tenant or user) has a configurable `maxPerMinute` and `burst`. The burst controls the immediate capacity while `maxPerMinute` governs steady-state refill.
- **Redis keys** – Limits are persisted under `feed:ingestion:config:{scope}:{scopeId}` (for example `feed:ingestion:config:tenant:acme`). Runtime counters live beneath `feed:ingestion:state:{scope}:{scopeId}`.
- **Default behavior** – If no override exists, the processor falls back to the environment defaults `INGESTION_RATE_LIMIT_PER_MINUTE` (default `600`) and `INGESTION_RATE_LIMIT_BURST` (default `1200`).

## Managing limits via GraphQL

Use the GraphQL mutation `upsertIngestionRateLimit` to create or adjust a limit:

```graphql
mutation UpdateTenantLimit {
  upsertIngestionRateLimit(
    input: { scope: TENANT, scopeId: "acme", maxPerMinute: 300, burst: 600 }
  ) {
    scope
    scopeId
    maxPerMinute
    burst
    updatedAt
    updatedBy
  }
}
```

To remove an override and fall back to defaults, call:

```graphql
mutation ResetTenantLimit {
  deleteIngestionRateLimit(scope: TENANT, scopeId: "acme")
}
```

Administrators can list all configured limits for a scope using the `ingestionRateLimits(scope: TENANT)` query.

## Operational recommendations

1. **Baseline per tenant:** Start with a burst equal to 2× the expected per-minute throughput to allow short spikes without overloading downstream services.
2. **User overrides:** Apply tighter user-specific overrides for power users that generate frequent bulk imports.
3. **Back-pressure strategy:** When rate limiting occurs, ingestion jobs fail fast with a `RateLimitExceededError`. Configure Bull queue retry strategies (delay or backoff) so the job automatically retries after the suggested cooldown.
4. **Monitoring:** Watch the feed-processor logs for `Ingestion rate limit exceeded` warnings, which include scope details and retry hints. Redis metrics (key TTLs and token counters) can also help visualize headroom.
5. **Review cadence:** Revisit limits quarterly or after major ingestion onboarding events to ensure the defaults still meet demand.

## Troubleshooting tips

- **Unexpected rate-limit hits:** Check for user overrides in Redis and confirm that the burst value is at least as large as the per-minute limit.
- **No Redis available:** The GraphQL mutations will return `SERVICE_UNAVAILABLE` if Redis is offline. Restore connectivity or point the server to a reachable Redis instance via `REDIS_URL` before updating limits.
- **Gradual rollouts:** Apply new limits to a staging tenant first, monitor the effect, then promote to production tenants using the same mutation inputs.

With these controls you can prevent runaway ingestion batches while still giving teams flexibility to scale imports safely.
