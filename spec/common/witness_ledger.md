# Witness Ledger

The witness ledger is the canonical registry for storing minimal evidence supporting decisions across
CIRW, FASC, PQLA, SATT, and QSDR. Witnesses are durable, replayable, and policy-bound.

## Objectives

- Provide tamper-evident evidence for every merge/split, quarantine, disclosure, or kill decision.
- Enforce proof budgets and policy-as-code constraints consistently.
- Enable external verification without raw data disclosure.

## Ledger Record Schema

| Field               | Type   | Description                                                       |
| ------------------- | ------ | ----------------------------------------------------------------- |
| `witness_id`        | string | Stable witness identifier.                                        |
| `artifact_id`       | string | Reference to the associated commitment envelope.                  |
| `artifact_type`     | string | Type of artifact being witnessed.                                 |
| `support_set`       | array  | Minimal evidence references (feature hashes, incident IDs, etc.). |
| `policy_ref`        | string | Policy decision ID and rule digest.                               |
| `proof_budget`      | object | Byte/feature/time constraints applied.                            |
| `determinism_token` | object | Snapshot + seed + version set.                                    |
| `created_at`        | string | RFC 3339 timestamp.                                               |
| `hash_chain_prev`   | string | Link to previous ledger entry.                                    |
| `attestation`       | object | Optional attestation for execution environment.                   |

## Storage Requirements

- Append-only storage with hash chaining and periodic anchoring.
- Multi-tenant partitioning with explicit federation tokens for cross-tenant access.
- Immutable retention policy enforced by policy-as-code.

## Validation Steps

1. Verify hash chain continuity and anchor checkpoints.
2. Confirm `artifact_id` commitment matches `support_set` references.
3. Validate policy decision ID against policy engine audit logs.
4. Ensure proof budget limits are satisfied.
5. Verify optional attestation signatures for sandboxed execution.

## Governance Hooks

- Witness creation must log compliance decisions that affect disclosure or access.
- Any ambiguity in witness evidence mapping must be escalated to governance review.
