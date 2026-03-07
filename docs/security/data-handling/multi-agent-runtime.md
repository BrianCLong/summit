# Multi-Agent Runtime Security and Data Handling

## Classification
- Controller goals: internal
- Task specs: internal
- Repo diffs: sensitive internal
- Secrets/env vars: restricted
- Burst queue metadata: internal
- Operational metrics: internal

## Never-log list
- API keys
- Access tokens
- Session cookies
- Full prompts containing credentials or PII
- Raw cloud auth headers
- Decrypted secret material

## Retention
- Deterministic artifacts: 30 days
- Operational logs: 7 days
- Burst queue dead-letter payloads: 3 days
- Drift trend summaries: 90 days
- Failed secret-bearing artifacts: do not persist; scrub and drop
