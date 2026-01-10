# Commitment Patterns for Resolution and Compliance Artifacts

## Goals

- Guarantee integrity of identifiers, analytics outputs, and policy decisions across products.
- Support verifiable replay, tenant isolation, and minimal disclosure.
- Provide policy-as-code friendly proof objects that are easy to validate independently.

## Core Commitment Primitives

- **Salted Hashing:** Derive salted hashes for identifiers and payloads to avoid raw value leakage.
- **Merkle Roots:** Commit to large identifier or output sets with a tree root; store path proofs with witnesses.
- **Hash Chaining:** Append-only sequencing for receipts, license records, and audit events.
- **Determinism Anchors:** Include snapshot IDs and seeds to make probabilistic flows reproducible.
- **Policy Binding:** Embed policy decision IDs and rule digests to bind outputs to policy-as-code.

## Canonical Commitment Envelope

| Field               | Type   | Purpose                                                          |
| ------------------- | ------ | ---------------------------------------------------------------- |
| `artifact_id`       | string | Stable identifier for the artifact instance.                     |
| `artifact_type`     | string | `identity_cluster`, `feed_calibration`, `analytics_output`, etc. |
| `tenant_id`         | string | Tenant or federation scope boundary.                             |
| `commitment_root`   | string | Merkle root or hash digest of payload.                           |
| `payload_schema`    | string | Schema identifier for verification.                              |
| `policy_ref`        | string | Policy decision ID and rule digest.                              |
| `determinism_token` | object | Snapshot + seed + model version set.                             |
| `created_at`        | string | RFC 3339 timestamp.                                              |
| `hash_chain_prev`   | string | Optional previous hash for append-only chains.                   |

## Application Patterns

1. **Identity Clusters (CIRW):** Merkle root over salted identifier hashes with per-edge feature hashes.
2. **Feed Calibration (FASC):** Commitment to feed weights, drift scores, and supporting incidents.
3. **Local Analytics (PQLA):** Commitment to query plan, policy decision, and sanitized aggregates.
4. **Transform Templates (SATT):** Commitment to executable measurement hash and metering counter.
5. **Recon Safety (QSDR):** Commitment to canary catalog, query-shape policy, and kill evidence.

## Proof Budgeting

- Favor minimal support sets under explicit byte and verification-time budgets.
- Include truncated transcript roots for verbose traces; store full logs in transparency backends.
- Define proof budgets in policy-as-code to ensure consistent enforcement.

## Verification Checklist

1. Validate the commitment envelope schema.
2. Recompute the commitment root from the referenced payload.
3. Verify policy decision ID and rule digest from the policy engine.
4. Validate determinism token parameters and snapshot availability.
5. Confirm hash chain continuity if `hash_chain_prev` is present.

## Replay Tokens

Pair commitments with replay tokens (snapshot + seed + version set) to rebuild artifacts deterministically.

## Compliance Logging

All commitment verifications that influence access, disclosure, or enforcement must emit a compliance decision
log entry referencing the `artifact_id`, `policy_ref`, and verification outcome.
