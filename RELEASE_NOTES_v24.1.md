**Release:** v24.1 — Hardening & Operations
**Date:** 2025‑**‑**

## Highlights

- Ingest reliability & idempotency hooks
- Redis caching + RPS limiter
- Residency guard + fine‑grained scopes
- Subscription latency metric; trace sampling

## SLO Validation

- Read p95: \_**\_ Write p95: \_\_** Error‑rate: \_**\_ Sub p95: \_\_** Ingest p95: \_\_\_\_

## Ops Notes

- Legacy server-side feature flag stack removed (`flags/store.ts`, `featureFlags/flagsmith.ts`, `services/FeatureFlagService.ts`); initialize flags via `server/src/feature-flags/setup.ts` and `@intelgraph/feature-flags`.
