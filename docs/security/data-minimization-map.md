# Summit Platform Data Minimization Matrix

| Dataset | Purpose Tags | Required Fields | Optional Fields | Lawful Basis | Retention Tier | Masking Strategy |
| ------- | ------------ | --------------- | --------------- | ------------ | -------------- | ---------------- |
| Case Files | investigation, fraud | subject_id, summary, high_risk_entities | timeline, scoring_metadata | Legitimate Interest | Short-30d | Deterministic tokenization for subject_id; redact narrative free text after 30 days |
| Audit Trail | audit | actor_id, action, timestamp, decision_hash | obligations | Legal Obligation | Long-365d (immutable) | Append-only ledger hashed with SHA-256 and signed via HSM |
| Intel Reports | investigation, analytics | report_id, synthesized_findings | aggregates, source_risk_score | Consent (analytics), Public Interest (investigation) | Short-30d (analytics) / Medium-90d (investigation) | Field-level encryption for source_risk_score |
| Behavioral Telemetry | analytics | anon_user_id, event_type, coarse_geolocation | session_features | Consent | Short-30d | k-anonymity bucketization for geolocation |
| Credential Store | authentication | credential_id, public_key | counter, transports | Legal Obligation | Persistent (rotated per device) | Hardware-backed secure enclave; hashed handles |

**Principles enforced**

- Default retention for records containing `contains_pii=true` is **30 days** unless a legal exception is recorded.
- Optional fields are dropped at ingest if the `purpose_tag` is not listed under the minimization matrix.
- Aggregation jobs consume only the fields marked as "Required" and operate in transient memory buffers purged within the same batch window.
- Audit records are never deleted or overwritten. Any correction generates a compensating entry with references to the immutable hash.
