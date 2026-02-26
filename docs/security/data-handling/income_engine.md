# Income Engine Data Handling

## Classification

- Inputs are business-model assumptions and evidence URLs.
- Outputs are aggregate financial projections and normalized metrics.

## Logging Rules

Never log:

- Personal financial data
- Email addresses
- Payment credentials

Allowed telemetry:

- Aggregate metrics (`asset_leverage_index`, `recurrence_score`, `simplicity_score`)
- Anonymized projection totals
- Evidence ID and validation status

## Retention

- Keep aggregate metrics for 30 days.
- Do not retain raw user payloads.
