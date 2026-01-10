# Multi-Performer Evaluation Plane (MPEP Core)

Defines scope-controlled collaboration and evaluator reproduction for multi-performer programs.

## Execution Flow

1. Receive execution request with scope token (sharing scope, TTL, performer identity, purpose binding).
2. Select sandbox policy (default passive-only egress); enforce endpoint allowlist and compute/egress budgets.
3. Execute module; monitor egress and emit receipts recording summaries and threshold halts.
4. Partition outputs into shareable shards per scope; generate shard manifest committing to shard hashes and replay token.
5. Sign and log manifest digest; enable verification without accessing withheld shards.

## Governance

- Scope tokens cached for TTL; validation failures halt execution with recorded reason.
- Replay tokens include module version sets and time-window identifiers for evaluator reproduction.
- Counterfactual shards generated under stricter scopes with information-loss metrics.
- Egress receipts and shard manifests must be persisted in the manifest and proof store.
