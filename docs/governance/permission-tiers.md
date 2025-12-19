# Permission Tiers

This matrix defines the graduated control levels for agent and human activity. Each tier balances velocity with governance, ensuring sensitive actions receive proportionate oversight.

## Tier Overview
- **Tier 1 – Informational:** Read-only queries and documentation lookups; no data mutation; minimal risk.
- **Tier 2 – Controlled Contribution:** Low-risk edits (docs, templates) in non-production scopes with automatic rollback available.
- **Tier 3 – Production-Adjacent:** Changes that touch staging/pre-production data, configuration flags, or limited-scope automations.
- **Tier 4 – Mission Critical:** Production systems, security controls, CI/CD, governance records, or any action with material customer impact.

## Approval Matrix
| Tier | Example Actions | Required Approvals | Evidence Required |
| --- | --- | --- | --- |
| 1 | Knowledge retrieval, read-only dashboards | None beyond run ticket | Run log with correlation ID |
| 2 | Documentation edits, template updates, non-prod data fixes | Agent Owner | Change record + diff link |
| 3 | Feature flag flips in staging, model eval runs with pre-prod data | Agent Owner + Approver | Dry-run results, rollback plan, signed approval |
| 4 | Production config changes, CI/CD pipeline updates, governance doc changes, security policy edits | Agent Owner + Approver + Governance Steward (separation of duties) | Full audit trail, on-call notification, rollback proof, impact assessment |

## Control Expectations by Tier
- **Logging:** All tiers require structured logs; Tier-3+ must include full prompt/tool traceability and immutable storage.
- **Separation of Duties:** Mandatory for Tier-3 and Tier-4. Approver must differ from Operator.
- **Change Windows:** Tier-4 actions allowed only within approved windows with on-call coverage.
- **Testing:** Tier-2+ requires automated checks when available; Tier-3+ must show dry-run or canary proof.
- **Data Boundaries:** Tier-3+ must document datasets accessed, residency constraints, and masking/redaction applied.
- **Kill Switches:** Tier-3+ runs require a clearly documented rollback or feature toggle.

## Mapping to Repository Paths
- **Tier 1–2:** General documentation and templates outside governance/security scope.
- **Tier 3:** Staging configurations and pre-production automation.
- **Tier 4:** `.github/` (CI/CD and policy), `docs/governance/` (canonical governance), and `docs/security/` (security controls). Ownership is enforced via CODEOWNERS.

## Escalation
Any ambiguity in tier assignment defaults to the higher tier. If a run encounters unexpected data access, treat it as Tier-4 and follow the incident process in `agent-incident-response.md`.
