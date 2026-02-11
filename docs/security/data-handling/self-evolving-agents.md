# Data Handling: Self-Evolving Agents

## Data Classification
- **PII/PHI**: Strictly prohibited in evidence logs.
- **Trace Data**: Redacted by default (see `summit/self_evolve/redact.py`).

## Redaction Rules
- Never log fields: `api_key`, `password`, `token`, `auth_token`, `secret`.
- Deterministic hashing for stable field identifiers within a run.

## Retention Policy
- Artifacts kept for 14 days by default.
- Evidence stored in `artifacts/self-evolving-agents/`.
