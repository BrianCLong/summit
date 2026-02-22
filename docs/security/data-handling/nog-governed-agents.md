# NOG Governed Agents — Data Handling Standard

## Summit Readiness Assertion
This standard operates under the Summit Readiness Assertion and the Constitution of the
Ecosystem.

## Scope
Data classification, retention, and logging rules for the Narrative Operating Graph (NOG) and
associated evidence artifacts.

## Data Classification
- **Restricted**: Raw message content, direct user identifiers, access tokens, auth headers.
- **Confidential**: NOG node attributes that could re-identify individuals or operations.
- **Internal**: Aggregated metrics, policy decision summaries, audit hashes.

## Never-Log List (Hard Rule)
- Raw message content.
- User identifiers (emails, phone numbers, device IDs).
- Access tokens, cookies, auth headers.
- Unredacted URLs containing query parameters.

## Redaction Requirements
- Replace identifiers with stable hashes or tokenized references.
- Strip or hash query parameters from URLs.
- Redaction occurs **before** audit logging or persistence.

## Retention
- `nog.snapshot.json`: TTL configurable per deployment policy.
- `audit.events.jsonl`: Longer retention with minimized payload + hashed references.
- `metrics.json` and `stamp.json`: Retained for evidence integrity; no timestamps stored.

## Access Controls
- Deny-by-default access to raw sources.
- Explicit policy grants required for privileged review.
- Human approval required for any action that could impact external narratives.

## Audit & Provenance
- All access decisions and policy evaluations are recorded in append-only logs.
- Hash-chain verification is mandatory for audit integrity.

## Compliance Notes
- Regulatory logic must be expressed as policy-as-code.
- Compliance decisions include explainable rationale and rule references.

## MAESTRO Security Alignment
- **MAESTRO Layers**: Data, Observability, Security.
- **Threats Considered**: Data leakage via logs, unauthorized access, policy drift.
- **Mitigations**: Never-log enforcement, redaction, least-privilege access, audit hash-chain,
  drift detection.
