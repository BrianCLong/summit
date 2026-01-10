# Witness Ledger Service

## Purpose

Provides append-only storage and verification for witness entries across CIRW, FASC, PQLA, SATT,
and QSDR.

## Responsibilities

- Store witness entries with hash chaining.
- Validate proof budgets and policy references.
- Serve witness verification endpoints.
- Emit compliance decision logs for access.

## Interfaces

- `POST /witness`: create witness entry.
- `GET /witness/{id}`: fetch witness entry with hash proofs.
- `POST /witness/verify`: verify witness payload and commitments.

## Observability

- Metrics: `witness_write_latency`, `witness_verify_latency`, `witness_chain_gap`.
- Logs: compliance decision references and policy IDs.
