# SpiderFoot-Zone MPEP Specification

Defines the multi-performer evaluation plane for scope-controlled collaboration and evaluator reproduction.

## Objectives

- Provide safe collaboration with strict scope tokens and egress receipts.
- Enable evaluators to reproduce runs via replay tokens and shard manifests.
- Prevent cross-performer leakage while enabling shareable outputs.

## Flow

1. Receive execution request and scope token with TTL and performer binding.
2. Select sandbox policy (default passive-only) and enforce egress/compute budgets.
3. Execute module; generate egress receipt and halt if thresholds exceeded.
4. Partition outputs into shareable shards per scope; generate shard manifest and replay token.
5. Sign manifest, log digest, and release permitted shards.

## Evaluator Integration

- API surface documented in `integration/intelgraph/api/mpep_openapi.md`.
- Sharding tool documented in `integration/mc/tools/shard_and_release.md`.
