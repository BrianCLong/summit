# Income Engine Data Handling

## Classification
- Inputs are modeled as non-PII business assumptions.
- Outputs are aggregate projections and scores.

## Logging Policy
Never log:
- Personal financial data
- Email addresses
- Payment credentials

Allowed logs:
- Aggregate metrics
- Anonymized projections
- Evidence ID only

## Retention
- Metrics retention: 30 days
- No raw user financial data persisted
