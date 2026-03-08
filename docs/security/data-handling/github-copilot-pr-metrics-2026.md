# Data Handling — GitHub Copilot PR Metrics (2026-02-19)

## Classification

- Aggregated engineering telemetry.
- No PII required for this lane.

## Never Log

- Access tokens
- User-level identifiers
- Raw API response headers containing signed URLs

## Retention

- 90-day rolling retention for derived evidence artifacts.

## Access Model

- Use least privilege for token scopes.
- Prefer GitHub App installation tokens for production automation.
