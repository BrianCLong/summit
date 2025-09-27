# Sprint 20 Plan

## Goals
- Deliver OPRF-based PSI inside clean rooms.
- Enable DP join templates for aggregates.
- Optional Kafka adapter for stream ingest.
- Establish Model Registry v1.

## Scope
- PSI sessions use ephemeral keys, nonces and TTL.
- DP joins enforce k>=25 with clipping and epsilon/delta accounting.
- Kafka adapter wired behind feature flag with quotas.
- Model registry tracks signatures and provenance.

## Non-Goals
- Heavy MPC or homomorphic encryption.
- Embedding generation or deep analytics.

## Timeline
- Sprint length: two weeks after Sprint 19.
- Mid-sprint demo; freeze 48h before end.

## Ceremonies
- Daily stand-up, mid-sprint demo, retrospective.

## Definition of Done
- Code merged, tests and lint pass, docs updated, templates regenerated.

## Backlog & Acceptance Criteria
- PSI token lifecycle: ephemeral, nonce-bound, TTL <= 30m.
- DP joins output only aggregates with labels (ε,δ,k,clip).
- Kafka adapter shows backpressure and honors quotas.
- Model registry promotion/rollback gated and signed.
