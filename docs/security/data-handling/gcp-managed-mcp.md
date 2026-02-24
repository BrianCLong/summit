# Data Handling: GCP Managed MCP

## Classification

- Public metadata: endpoint/service metadata.
- Controlled output: capped query rows.
- Restricted: sensitive row fields and derived PII.

## Never-Log Fields

- Access tokens
- OAuth/JWT bearer credentials
- Raw uncapped result sets
- Direct PII columns when policy marks them sensitive

## Guardrails

- Deny-by-default policy for tools/projects.
- Mandatory row caps.
- Structured query contract only; no free-form SQL.
- IAM scope check requires `cloud-platform.read-only` for read probes.

## Retention

- Evidence artifacts (`report.json`, `metrics.json`, `stamp.json`): 30 days default.
- Operational logs: 7 days default.
