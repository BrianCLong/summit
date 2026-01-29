# Data Handling: Guardrailed Prompt → Procedure (P2P)

## Classification

Procedures are classified as internal governance artifacts. They may reference sensitive case IDs
and model IDs but must not embed raw PII or credentials.

## Never-Log List

Do not log or persist:

- Raw prompts or model outputs
- API keys, tokens, or credentials
- PII payloads or full query results
- Raw enrichment responses (store hashes or row counts only)

## Retention

- Evidence artifacts inherit the default Summit retention policy.
- Drift reports default to 30 days unless superseded by policy.

## Egress Controls

- Export destinations are allowlisted and enforced at validation and runtime.
- HTTP enrichment domains are allowlisted and capped by policy budgets.

## Evidence Hygiene

Evidence artifacts are immutable per execution and never include wall-clock timestamps in
`stamp.json` to preserve determinism.

## Incident Response

If a Procedure violates policy or evidence hygiene, disable execution via the Procedure kill switch
and follow the operations runbook.
