# Evidence Capsule Standard

Defines the canonical, replayable container for analytic outputs across wedges.

## Purpose

Evidence capsules provide a deterministic, minimal-disclosure package that can be
replayed and audited without re-executing upstream ingestion. Capsules are the
unit of exchange between analysis pipelines, policy enforcement, and downstream
clients.

## Capsule Schema (Logical)

```yaml
capsule_id: <uuid>
created_at: <rfc3339>
producer:
  service: <string>
  version: <semver>
  environment: <string>
policy_context:
  policy_version: <string>
  subject: <string>
  purpose: <string>
replay:
  replay_token: <string>
  snapshot_id: <string>
  time_window:
    start: <rfc3339>
    end: <rfc3339>
artifacts:
  - artifact_id: <string>
    artifact_type: <string>
    digest: <sha256>
    uri: <string>
commitment:
  merkle_root: <hex>
  algorithm: <string>
provenance:
  witness_chain_ref: <string>
  transparency_log_ref: <string>
attestation:
  attestation_ref: <string>
constraints:
  disclosure_budget: <string>
  retention_ttl: <duration>
```

## Required Properties

- **Determinism**: given the replay token, the capsule must be reproducible.
- **Minimal disclosure**: content is bounded by disclosure budgets and redaction.
- **Verifiability**: capsule artifacts are covered by cryptographic commitments.
- **Traceability**: each capsule references witness chains and transparency logs.

## Lifecycle

1. **Assemble**: compute artifacts, replay token, and commitments.
2. **Validate**: enforce schema version, disclosure budgets, and policy checks.
3. **Persist**: store artifacts and register a transparency-log entry.
4. **Distribute**: publish capsule metadata and bounded payload to consumers.
5. **Replay**: recompute artifacts using snapshot + token for audit or dispute.

## Policy Integration

- Policy decisions are expressed as policy-as-code rules in the policy engine.
- The capsule includes the policy version and decision identifier to support
  replay and audit requirements.

## Security & Compliance

- Capsules MUST avoid raw identifiers when disclosure constraints require
  aggregation or hashing.
- Capsules MUST carry retention TTLs to enforce downstream deletion.
- Any compliance ambiguity should be escalated to governance and recorded.
