# Witness Chain Standard

Defines the witness chain structure used to prove execution lineage.

## Purpose

Witness chains provide tamper-evident, append-only audit records linking each
execution step to its inputs, outputs, and policy decisions.

## Witness Record Schema (Logical)

```yaml
witness_record:
  record_id: <uuid>
  created_at: <rfc3339>
  actor:
    service: <string>
    version: <semver>
  inputs:
    - artifact_id: <string>
      digest: <sha256>
  outputs:
    - artifact_id: <string>
      digest: <sha256>
  policy:
    decision_id: <string>
    policy_version: <string>
  environment:
    attestation_ref: <string>
  chain:
    prev_record_id: <uuid>
    chain_hash: <sha256>
```

## Chain Properties

- **Append-only**: each record references a prior record ID and chain hash.
- **Tamper-evident**: altering any record invalidates downstream hashes.
- **Traceable**: every capsule maps to a chain path.

## Operational Guidance

- Log witness records for ingestion, transformation, and capsule assembly.
- Persist witness chains in an immutable ledger with retention controls.
- Expose read-only retrieval for audit reviewers.
