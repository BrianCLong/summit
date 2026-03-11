# Summit GA Escalation & Decision Matrix

This matrix defines the decision flow and ownership for the Summit GA launch window.

## 📞 Escalation Tiers

| Level | Role | Responsibility | Contact |
|-------|------|----------------|---------|
| **L1** | SRE On-Call | Primary signal monitoring and initial triage. | `#summit-ops` |
| **L2** | Domain Lead | Technical deep-dive and hotfix approval. | `@domain-leads` |
| **L3** | Release Captain | Final Go/No-Go and Rollback authorization. | `@release-captain` |
| **L4** | CTO / Head of Engineering | Stakeholder comms for P0 outages. | `@eng-leadership` |

---

## 🚦 Decision Flow (Launch Week)

### 1. Post-Deploy Failure (T+15m)
- **Signal**: `validate-summit-deploy.mjs` returns **RED**.
- **Action**: 
  - SRE On-Call (L1) pauses all traffic.
  - Release Captain (L3) evaluates `evaluate-rollback-criteria.mjs`.
  - **Decision**: If criteria breached, L3 authorizes **Immediate Rollback**.

### 2. Early-Life Regression (T+1h to T+24h)
- **Signal**: `GALaunchRetryStorm` fires or error rate spikes.
- **Action**:
  - SRE (L1) creates P0 incident.
  - Domain Lead (L2) initiates the **4-Hour "Fast Path" Loop**.
  - **Decision**: If fix cannot be verified within 4 hours, L3 evaluates Rollback.

---

## 🔒 Rollback Authorization Thresholds

The Release Captain (L3) has standing authority to rollback if:
1. **Total Outage**: Any core service down for > 5 minutes.
2. **Evidence Failure**: Any valid signature mismatch in the governance ledger.
3. **Security**: Any confirmed unauthorized administrative access.

---
*Verified for Summit GA Release 2026-03-09*
