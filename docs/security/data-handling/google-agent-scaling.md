# Agent Scaling Data Handling Policy

## Never Log
- LLM prompts (hash only)
- Customer data (PII redaction)
- API tokens
- Vector embeddings

## Retention
- Benchmarks: 30 days
- Metrics: 90 days

Deterministic artifact generation must not include `generated_at` timestamps.
