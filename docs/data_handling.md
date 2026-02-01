# Data Handling & Privacy

## Classification
- **High Sensitivity**: User prompts, API keys, PII.
- **Medium Sensitivity**: aggregated metrics, persona selection.
- **Low Sensitivity**: System logs, error codes.

## Retention
- Audit logs: 90 days.
- Ephemeral state: cleared after session.
- Evidence artifacts: 30 days.

## Never-Log Policy
The following fields must never appear in logs:
- `password`
- `api_key`
- `secret`
- `token`
- `prompt` (unless explicitly opted-in for debug)
- `user_pii`
