# Data Handling: MCP Apps

## Classification
- **Public**: Manifests, schemas, policies.
- **Internal**: Evidence bundles, audit logs.
- **Confidential**: Redacted payloads, tokens (never logged).

## Retention
- Evidence bundles: 1 year (configurable).
- Stamps: Indefinite.
- Raw UI payloads: Hashes only.

## Non-Logging Fields
- Tokens, cookies, OAuth codes.
- PII in payloads (channel messages, file contents).
