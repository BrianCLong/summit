# GraphQL Rate Limiting Guide

This service now enforces per-identity GraphQL rate limiting backed by Redis. Limits are
applied using an Apollo Server plugin that counts requests per authenticated user (or
falls back to the caller's IP address) within a sliding time window.

## Default tiers

| Tier       | Window | Max requests |
| ---------- | ------ | ------------- |
| `free`     | 1 hour | 1,000         |
| `supergrok`| 1 hour | 5,000         |

The tier is chosen from, in order of precedence:

1. `GraphQLRequestContext` properties such as `context.user.usageTier`, `context.user.plan`,
   or a top-level `context.usageTier` set by upstream auth middleware.
2. HTTP headers (`x-usage-tier`, `x-plan`, `x-tier`, or `x-subscription-tier`).
3. Fallback to the `free` tier when no hint is provided.

## Configuration knobs

All settings can be tuned via environment variables (also available in `.env.example`):

- `GRAPHQL_RATE_LIMIT_WINDOW_SECONDS`: Default sliding window length in seconds for the
  `free` tier.
- `GRAPHQL_RATE_LIMIT_FREE_LIMIT`: Requests allowed per window for free workloads.
- `GRAPHQL_RATE_LIMIT_SUPERGROK_LIMIT`: Requests allowed per window for SuperGrok users.
- `GRAPHQL_RATE_LIMIT_SUPERGROK_WINDOW_SECONDS` *(optional)*: Override the window length for
  SuperGrok requests if they should renew faster or slower than the default.
- `GRAPHQL_RATE_LIMIT_REDIS_URL`: Redis endpoint used specifically by the GraphQL limiter.
  Defaults to `REDIS_URL` when not set.

You can add more tiers or override the defaults by extending `rateLimitPlugin` options when
constructing the Apollo server.

## Operational guidance

- **Monitoring**: The plugin publishes `Retry-After`, `X-RateLimit-*` response headers to
  help clients back off gracefully. Capture these in API telemetry dashboards.
- **Testing**: Integration tests (`server/tests/graphql/rateLimitPlugin.test.ts`) validate
  enforcement logic with in-memory stores. When changing limits, update those expectations.
- **Scaling**: For clustered deployments ensure all GraphQL instances share the same Redis
  endpoint so counts remain consistent. Redis persistence or clustering is recommended when
  raising the default window above one hour.
- **Tuning approach**: Start from the defaults, monitor peak request volumes per tier, and
  adjust `*_LIMIT` and `*_WINDOW_SECONDS` in tandem. SuperGrok should remain a multiple of the
  free tier to reflect its premium SLA.
