# Narrative Dominance Technologies Data Handling (Defense-Only)

## Classification
- Ingested content defaults to **Public OSINT** unless explicitly reclassified by governance policy.
- Analyst annotations and case links inherit the parent case classification.

## Never-Log List
- Raw tokens, API keys, session secrets.
- Full raw documents or full raw media.
- User identifiers unless hashed and approved by policy.

## Evidence Pack Rules
- Evidence packs contain redacted exemplars plus hashed references to full text.
- Full text export requires privileged role and explicit approval.
- Evidence packs must be deterministic and schema-validated.

## Retention & Access
- Retention follows tenant policy with least-privilege access.
- Access is restricted to allowlisted roles and audited pathways.

## Deny-by-Default Controls
- Ingestion sources are disabled until explicitly enabled per tenant.
- Exports and automation remain disabled until explicit approvals exist.

## MAESTRO Security Alignment
- **MAESTRO Layers:** Data, Observability, Security.
- **Threats Considered:** privacy leakage, evidence tampering, over-collection.
- **Mitigations:** redaction by default, hashed references, audit logs, explicit allowlists.
