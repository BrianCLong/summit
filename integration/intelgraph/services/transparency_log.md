# Transparency Log Service

## Role

Append-only ledger for commitments from MRSGS campaign artifacts, CEVH forecasts, POAR proof objects, JPC certificates, and EAMS receipts.

## Responsibilities

- Accept digests plus determinism tokens; generate inclusion proofs.
- Maintain Merkle trees with periodic checkpoints to external anchors.
- Expose read APIs for verifiers to retrieve inclusion proofs and log consistency checks.
- Alert on inclusion latency regressions relative to SLA.
