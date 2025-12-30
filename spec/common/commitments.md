# Commitment Patterns for Resolution and Compliance Artifacts

## Goals

- Guarantee integrity of identifiers, analytics outputs, and policy decisions across products.
- Support verifiable replay, tenant isolation, and minimal disclosure.

## Techniques

- **Salted Hashing:** Derive salted hashes for identifiers and payloads to avoid raw value leakage.
- **Merkle Roots:** Commit to large identifier or output sets with a tree root; store path proofs with witnesses.
- **Hash Chaining:** Append-only sequencing for receipts, license records, and audit events.
- **Determinism Anchors:** Include snapshot IDs and seeds to make probabilistic flows reproducible.

## Application Patterns

1. **Identity Clusters (CIRW):** Merkle root over salted identifier hashes with per-edge feature hashes.
2. **Feed Calibration (FASC):** Commitment to feed weights, drift scores, and supporting incidents.
3. **Local Analytics (PQLA):** Commitment to query plan, policy decision, and sanitized aggregates.
4. **Transform Templates (SATT):** Commitment to executable measurement hash and metering counter.
5. **Recon Safety (QSDR):** Commitment to canary catalog, query-shape policy, and kill evidence.

## Proof Budgeting

- Favor minimal support sets under explicit byte and verification-time budgets.
- Include truncated transcript roots for verbose traces; store full logs in transparency backends.

## Replay Tokens

- Pair commitments with replay tokens (snapshot + seed + version set) to rebuild artifacts deterministically.
