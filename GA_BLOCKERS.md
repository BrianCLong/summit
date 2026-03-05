# GA Blockers (Manual Checks)

The following items are identified as blockers for GA and require manual verification or assignment.

| ID | Description | Owner | Status |
|----|-------------|-------|--------|
| secrets_scanning | Confirm secrets scanning is enabled and current. | @security-lead | Pending |
| dependency_vulnerability_scan | Confirm latest dependency vulnerability scan passed or waivers recorded. | @security-lead | Pending |
| error_taxonomy | Confirm error taxonomy is enforced in core paths. | @eng-lead | Pending |
| branch_protection | Confirm branch protection rules are enforced on main and release branches. | @eng-lead | Pending |
| agent_permissions | Confirm agent permission tiers are respected in automation. | @security-lead | Pending |
| audit_logging_ci_agents | Confirm CI and agent actions are audit logged. | @security-lead | Pending |
| observability_metrics | Confirm metrics exist for ingestion, retrieval, and RAG flows and error mapping. | @sre-lead | Pending |

**Action Items:**
1. Owners please update the status in `release/ga-gate.yaml` or this file.
2. Link evidence in `GA_GATE_ISSUE.md`.
