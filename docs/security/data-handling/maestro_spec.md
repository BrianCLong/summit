# Maestro Spec Data Handling

## Data Classes

- Interview transcripts: confidential
- Generated spec bundles: internal
- Metrics and reports: internal

## Never-Log List

- API keys
- Access tokens
- Passwords and secrets
- Private analyst notes containing sensitive context

## Handling Rules

- Redact sensitive values prior to writing artifacts.
- Keep timestamps isolated to `stamp.json`.
- Do not include plaintext credentials in `spec_bundle.json`, `report.json`, or `metrics.json`.

## Retention Guidance

- Retain generated artifacts under standard project evidence retention policy.
- Remove ad hoc raw transcript dumps after conversion to structured bundle artifacts.
