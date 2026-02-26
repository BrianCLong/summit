# Orchestrator Data Handling Standard

## Classification

The orchestrator handles workflow metadata, agent outputs, policy decisions, and deterministic evidence artifacts.

## Never Log

- API keys or bearer tokens
- Agent system prompts containing secret/internal policy content
- Raw tool credentials or secret payloads

## Logging Rules

- Log only minimally required context:
  - workflow/node/edge IDs
  - evidence ID
  - policy decision code/reason
- Prefer redacted outputs when tool payloads can contain sensitive values.

## Retention

- Execution traces: 30 days
- Metrics: 90 days

## Security Controls

- Deny-by-default for cross-agent tool execution.
- Explicit per-edge allowlist for permitted tool handoffs.
- Deterministic artifacts to support audit and tamper detection via stable hashes.
