# Feature Flags

This document outlines the feature flags used in the application.

| Flag Name | Description | Default |
| --------- | ----------- | ------- |
| FEATURE_PROV_LEDGER_MVP | Enables Provenance Ledger export bundle + manifest endpoints (GraphQL mutation `exportCase`) | off (prod), on (dev/stage)
| FEATURE_EXPORT_POLICY_CHECK | Enforces license/policy checks on export and returns human-readable block reasons | off (prod), on (dev/stage)
| FEATURE_NL_QUERY_PREVIEW | Enables NL→Cypher preview and sandbox execution (GraphQL mutation `previewNLQuery`) | off (prod), on (dev/stage)
| FEATURE_COST_GUARD_MVP | Enables per-tenant query budgeter (token bucket) that returns 429 with `Retry-After` | off (prod), on (dev/stage)

Environment variables control these flags. Example:

```
# .env
FEATURE_PROV_LEDGER_MVP=true
FEATURE_EXPORT_POLICY_CHECK=true
FEATURE_NL_QUERY_PREVIEW=true
FEATURE_COST_GUARD_MVP=true

# Optional service endpoints
PROV_LEDGER_URL=http://localhost:8010
PROV_LEDGER_API_KEY=testkey
RAG_URL=http://localhost:8020
```
