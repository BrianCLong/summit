# Artifact Classification for Summit Bench

## Deterministic / Public Tier
- `metrics.json`: High-level benchmark scores (latency, tokens, success rate).
- `report.json`: Aggregate pass/fail results.
- `stamp.json`: Cryptographic stamp of public metrics.
- `signed bundle`: Verifiable public signatures.

These files contain strictly stable metrics and structural schema validation. They do not contain user data, internal prompts, or specific query texts unless explicitly synthetic.

## Private / Internal Tier
- `trace.json`: Full LLM inference traces, potentially containing proprietary prompts or system prompts.
- `plan.json`: Agent intermediate planning stages, which may expose internal orchestrator capabilities.

## Data Rules
- Non-deterministic timestamps must only exist in non-determinism metadata envelopes or `stamp.json`, not deeply nested inside `metrics.json` or `report.json`.
- Object keys should be alphabetically ordered in public artifacts to ensure byte-for-byte exact matches.
