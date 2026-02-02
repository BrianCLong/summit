# DAAO Data Handling

## Classification

*   **Query Text**: Confidential. Never logged in raw form in artifacts.
*   **Difficulty Signal**: Internal metadata. OK to log.
*   **Critique**: Confidential (may contain excerpts). Handled carefully.

## Retention

*   Drift artifacts (`scripts/monitoring/out/daao-drift.json`) must contain only aggregated or hashed data, no PII or user content.
*   Raw logs are subject to standard retention (30 days).

## Forbidden Actions

*   Do not log API keys or full prompt payloads to `stdout` in production.
*   Do not store user queries in `evidence/` unless explicitly allowed for debugging.
