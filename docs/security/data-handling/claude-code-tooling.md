# Data Handling: Claude-Code Tooling Agent

## Classification
- Output artifacts are Internal governance evidence.
- Do not include secrets, API keys, or user PII.

## Retention
- Tooling artifacts: 30 days (operational baseline).
- Execution logs: 7 days.

## Guardrails
- Prompt-injection indicators cause task blocking.
- Feature flag defaults to disabled behavior.
- Deterministic artifacts are schema validated in CI.
