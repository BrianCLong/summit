## Release: v24.0.0 — Global Coherence Ecosystem

**Date:** 2025‑09‑08

## Highlights

- Tenant coherence score API with realtime subscriptions.
- Strict persisted‑query allowlist; OPA ABAC per tenant.
- Prometheus metrics + SLO alerts; evidence bundle in CI.

## New

- GraphQL: `tenantCoherence`, `publishCoherenceSignal`, `coherenceEvents`.
- Redis‑backed PubSub (in‑memory fallback for dev).
- `/metrics` endpoint with latency histograms.

## Ops Notes

- Canary 10% → 50% → 100%; auto‑rollback on SLO breach or >5%/hr budget burn.
- Feature flag: `v24.coherence`.

## Breaking Changes

- None.

## Upgrade Steps

1. Freeze persisted query hashes; deploy gateway allowlist.
2. Deploy server image `v24.0.0`; enable `v24.coherence` in staging.
3. Run SLO suite; canary per playbook.

## Artifacts

- Image: `ghcr.io/<org>/intelgraph-server:v24.0.0` (digest: `<sha256:...>`)
- Evidence bundle attached to release assets.
