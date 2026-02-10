# Data Handling: item-UNKNOWN (Framework)

## Data classes

- Public: docs templates, schema files.
- Internal: CI evidence outputs (non-secret).
- Confidential/Regulated: Not permitted in evidence outputs.

## Retention

- CI evidence runs: retain per CI policy; avoid secrets.

## Audit export

- `evidence/index.json` + referenced files.

## Never-log fields

- Tokens, credentials, API keys, customer data, user identifiers.
