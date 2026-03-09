# Bellingcat OSINT Toolkit Data Handling

## Never-log policy

- raw cookies
- auth headers
- session tokens
- full-page HTML captures by default
- PII from social profiles unless explicitly classified and consented

## Default retention

- Artifacts are retained locally only.
- No automatic artifact upload is allowed in MWS mode.

## Redaction

- Use structured logging with denylist key filtering.
- Denylist keys include: `cookie`, `authorization`, `set-cookie`, `token`, `session`, `password`.
