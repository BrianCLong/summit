# Data Handling: ai-mockup-2026

## Classification
- Source claims are public marketing claims only.
- Outputs are benchmark metadata and synthetic metrics.

## Never-log
- User prompts from product workloads
- API keys and tool tokens
- Credential-bearing request metadata

## Retention
- Keep generated metrics artifacts for 30 days by default in CI artifact retention.

## Constraints
- Deny by default for networked SaaS invocation.
- No tool credential storage in repository.
