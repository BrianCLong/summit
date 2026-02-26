# AgentPlace Data Handling Policy

## Classification
- **Public**: Agent name, version, description, capabilities list.
- **Internal**: Owner email, internal API scopes.
- **Confidential**: Risk scores, governance reports.
- **Restricted**: None (PII not allowed in manifest).

## Logging Policy
- **Never Log**: API keys, OAuth tokens, PII fields.
- **Retention**: Reports stored for 30 days.

## Data Flow
Manifests are processed in-memory by the evaluator. Reports are generated as JSON artifacts and stored in CI artifacts or evidence store.
