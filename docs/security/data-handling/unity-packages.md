# Unity Package Data Handling

## Sensitive Fields
Do not log or persist:
- Registry auth tokens.
- Private registry hostnames beyond policy matching output.
- Absolute local filesystem paths.

## Retention
- Package reports: 30 days.
- Drift reports and metrics: 90 days.

## Security Controls
- Enforce HTTPS-only registry policy (`http://` blocked).
- Validate versions via strict semantic version rules.
- Fail closed when policy data is missing or malformed.
