# Non-Public Data Access: Data Handling & Retention

## Authority Alignment
This standard aligns with:
- [Asset Classification Policy](../ASSET_CLASSIFICATION.md)
- [Security Guidelines](../SECURITY_GUIDELINES.md)
- [Secrets Governance](../SECRETS_GOVERNANCE.md)

## Data Classifications (Aligned)
Use the classification tiers defined in the Asset Classification Policy. For operational labels,
apply the canonical values below (case-insensitive):
- **Public**
- **Internal**
- **Confidential**
- **Restricted**

## Required Fields (Per Record)
Every non-public record must include:
- `source_id`
- `collector`
- `sensitivity` (classification label)
- `purpose`
- `retention_days`
- `collected_at` (allowed in runtime logs only; excluded from deterministic artifacts)
- `provenance` (field-level or record-level tags)

## Never-Log List
Do **not** store or emit the following in deterministic artifacts or logs:
- Raw tokens or API keys
- Session cookies
- Authorization headers
- Password fields
- Full response bodies from restricted sources by default

Store hashes and minimal metadata instead. Use redaction middleware before any audit write.

## Retention & Minimization
- Bind collection to a declared **purpose**.
- Enforce **retention_days** in policy rules and tool wrappers.
- Apply data minimization at ingestion; do not over-collect.

## Provenance & Evidence
- Each field must carry provenance, including source and collection method.
- Evidence ID pattern: `EVID:<item-slug>:<run_id>:<source_id>:<seq>`.
- Deterministic artifacts must have stable ordering and no timestamps.

## Governance Gates
- Deny-by-default policy gate on all non-public tools.
- HITL approvals for sensitive sources.
- Drift detector for policy baseline hash.

## Compliance Positioning (Intentionally Constrained)
This standard supports compliance programs but does not guarantee jurisdiction-wide compliance
without legal review and org-specific controls.
