# Tool Governance Policies

Summit enforces a **deny-by-default** tool policy to ensure security and auditability.

## ToolPolicy

The `ToolPolicy` object defines an allowlist of tools that a subagent is permitted to use. Any attempt to use a tool not in the allowlist results in a policy denial.

## Redaction

All logs and evidence artifacts are processed to redact sensitive information such as API keys, tokens, and passwords.

- **NEVER_LOG_FIELDS**: A predefined list of sensitive field names that are always redacted.
- **Evidence Determinism**: Timestamps are strictly forbidden in `report.json` and `metrics.json`, and are only allowed in `stamp.json`.
