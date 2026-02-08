# Data Handling: Kimi K2.5 via NVIDIA Integrate Endpoints

## Classification

- Default classification: **Customer Data**
- Escalation path: Security triage required for any exception request.

## Never-Log List

- Authorization headers (`Bearer $NVIDIA_API_KEY`)
- Raw prompts or user messages
- Image/video bytes or derived embeddings
- Full model responses (store only aggregates or redacted excerpts)

## Retention Rules

- Persist only aggregate metrics by default.
- Any trace storage requires explicit opt-in and redaction.

## Redaction Requirements

- Deterministic redaction transform for debug traces.
- Replace secrets and PII with stable hashes (no salts stored in code).

## Data Egress Controls

- Deny-by-default outbound policy.
- Allowlist required for `integrate.api.nvidia.com`.

## Incident Handling

- If leakage is suspected, rotate API keys immediately and open a security incident.
- Capture evidence in the security incident ledger; do not paste raw prompts.
