# Policy by Default

## Principles
- Deny-by-default for queries, exports, and connector writes unless policy bundle explicitly allows.
- Human-readable denial reasons with remediation steps and appeal path.
- Authority binding: warrant or ticket ID required for sensitive datasets.

## Examples
- **Export blocked**: dataset flagged as partner-restricted; message includes license/TOS clause and link to selective disclosure tiers.
- **Query throttled**: cost guard detects over-budget; user receives budget status, suggested sampling, and appeal button.
- **Connector ingest paused**: source marked as poisoned; quarantine notice with provenance evidence and reopen criteria.

## Appeal Path
1. User submits justification (purpose, scope, authority) from UI prompt.
2. Governance queue receives ticket with policy version, dataset IDs, and manifest hashes.
3. Approver can issue scoped override with expiry; decision logged to audit and manifest.
4. Appeals audited weekly; metrics: approvals, denials, time-to-decision, regressions.
