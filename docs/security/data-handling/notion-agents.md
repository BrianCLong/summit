# Notion Agents Data Handling

## Classification

- Allowed: workflow metadata, step IDs, action names, deterministic fingerprints.
- Disallowed: secrets, API keys, raw user prompts, access tokens, session cookies.

## Never Log

- `Authorization` headers
- Provider API keys
- Raw prompt payloads
- User-provided secret values

## Retention

- Runtime logs: 30 days
- Evidence artifacts: retained per governance policy

## Output Controls

- `report.json` and `metrics.json` must not include timestamps.
- `stamp.json` is the only file that may include `generated_at`.
- All files must be deterministic and hash-stable for identical input plans.
