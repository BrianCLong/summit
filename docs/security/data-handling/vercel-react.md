# Data Handling: React Practices Evidence

## Never Log

- Source file contents.
- Environment variables.
- Credentials, tokens, or other secrets.

## Allowed Log Fields

- `ruleId`
- `file`
- `importPath` (only for boundary violations)

## Retention

- Keep generated `reports/react-best-practices/*` artifacts for 30 days in CI artifact retention.
