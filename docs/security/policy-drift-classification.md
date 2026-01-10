# Policy Drift Classification Rules

Drift reports are scored for severity and explainability using deterministic rules:

- **Allowlist expanded** → `risky` (increases blast radius for tool use).
- **Denylist reduced** → `risky` (removes previously blocked surfaces).
- **Budgets increased** → `risky` (higher spend/abuse window).
- **Strict attribution disabled** → `critical` (breaks accountability chain).
- **Approvals removed** → `critical` for high-risk tools/categories.
- **Redaction disabled/loosened** → `critical` (risk of leakage).
- **Risk weight decreased** → `risky` (weakens scoring on hazardous tools).

Severity derivation:

- Any `critical` diff → report severity `critical`.
- Otherwise any `risky` diff → report severity `high`.
- Otherwise diffs exist → severity `low`.
- No diffs → severity `none`.

All rules are defensive-only and produce proposal-only remediation suggestions (no automated changes).
