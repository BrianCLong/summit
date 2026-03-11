# Trust Portal API

This document details the Trust Portal API which surfaces the redacted summaries described in `summary_schema.md`.

## Endpoints

All endpoints are read-only and return static snapshots of trust telemetry, with no stream or query parameters allowing access to raw data.

### `GET /trust/v1/risk-summary`
Returns the aggregated `TrustRiskSummary`.

### `GET /trust/v1/governance-summary`
Returns the aggregated `GovernanceSummary`. If the Governance Council has marked this category internal-only, it will return an empty or masked structure.

### `GET /trust/v1/automation-summary`
Returns the aggregated `AutomationSafetySummary`. Similarly bounded by Governance configurations.

## Authentication and Scopes
The API relies on token-based authentication. An `Authorization: Bearer <token>` header must be provided. The token must possess the explicitly granted `trust_read` scope, limiting access only to approved external stakeholders (auditors, partners).

## Abuse Guardrails
- **Redaction by Design**: The underlying query layer filters out individual entity parameters.
- **Council Toggle**: Metrics can be turned off on the fly (e.g. disabling the automation endpoint) via the Governance Council without redeploying.
