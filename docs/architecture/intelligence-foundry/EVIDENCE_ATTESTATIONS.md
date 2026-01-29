# Evidence and Attestations (Normative)

## Evidence Bundle Contents (Required)

Each completed work order MUST produce an evidence bundle containing:

1. work_order.json
2. execution_graph.json
3. artifacts_manifest.json
4. policy_decisions.json
5. attestation.json
6. stamp.json

Optional (policy-driven):

- retrieved_sources.json (for retrieval)
- redaction_report.json
- watermark_report.json
- evaluation_report.json
- model_card.json (if model created/modified)

## Attestation Semantics

The attestation MUST bind, at minimum:

- work_order_id
- tenant_id
- principal_id
- policy_hash
- execution_graph_hash
- artifacts_manifest_hash
- output_artifact_hashes
- reproducibility_mode
- signing_identity + key reference
- timestamp

Attestation MUST be verifiable offline.

## Verification Requirements

A verifier MUST be able to:

- validate signatures using tenant trust roots
- validate all referenced hashes exist and match
- validate policy decision trace is complete
- validate execution graph is deterministic and acyclic
- validate output artifacts correspond to manifest

## Control Objectives Mapping (Non-Exhaustive)

- Change management: environment metadata + code revision + container digests
- Access control: policy_decisions.json with allow/deny trace
- Audit logging: execution graph nodes represent immutable audit events
- Data handling: rights_profile and retention_profile enforcement evidence
