# Runbook: Influence Ops Jobs

## Scope

Operational runbook for influence-ops pipelines: ingestion, clustering, attribution review, replay,
and evidence generation.

## SLOs

- Pipeline success rate: >= 99%
- Determinism replay parity: 100% for protected jobs
- Attribution HITL SLA: p95 under 60 minutes
- Evidence bundle completeness: 100% for merged PRs affecting influence-ops paths

## Standard Job Flow

1. Collect and normalize inputs
2. Enrich with narrative/media/entity signals
3. Run graph analytics and scoring
4. Pause at HITL checkpoints where required
5. Generate output and evidence artifacts

## Backfill Procedure

1. Pin input snapshot and dependency versions
2. Execute backfill in tenant-scoped batches
3. Run determinism replay check on sampled windows
4. Compare metric drift against baseline thresholds
5. Release results only after gate pass

## Incident Response

Trigger incident when:

- determinism replay fails
- attribution export gate is bypassed or unavailable
- tenant isolation alert fires

Immediate actions:

1. Freeze affected export pipelines
2. Open incident and attach latest evidence bundle
3. Roll back to last known good ruleset/model hash
4. Re-run deterministic replay before restore

## Offline and Residency Controls

- CI/evals must run without external network dependency
- tenant data and embeddings must stay in assigned region
- cross-region retrieval requires explicit policy approval
