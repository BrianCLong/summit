# Sampling & Spot-Check Readiness Playbook
> **Status**: Ready for Audit
> **Objective**: Enable random, verifiable inspection of controls.

## 1. Sampling Strategy

Auditors will not check every record. They will check a **sample** (usually 10-25 items).
This playbook defines how to generate valid samples and how to verify them.

### Sample Selection Methodology
* **Randomness**: Use `shuf` or similar CSPRNG for selection.
* **Period**: Last 30 days of operation.
* **Stratification**: Ensure samples cover different tenants and user roles.

---

## 2. Guided Walkthroughs (By Control)

### A. Access Control Walkthrough
**Scenario**: "Show me how a user was granted access."

1. **Pick a user**:
   ```bash
   # List recent signups
   grep "UserCreated" logs/audit.log | tail -n 20 | shuf -n 1
   ```
2. **Trace to Authorization**:
   * Show the `UserCreated` event in the Event Store.
   * Show the corresponding `GrantRole` event.
   * Verify the OPA policy that permitted this (`policy/rbac.rego`).

### B. Change Management Walkthrough
**Scenario**: "Show me the approval for this specific commit."

1. **Pick a commit**:
   ```bash
   git log --since="30 days ago" --format="%H" | shuf -n 1
   ```
2. **Trace to Evidence**:
   * Find the associated PR (via GitHub API or Commit Message).
   * Verify "Approved" review state.
   * Verify CI "Success" status check.
   * **Evidence**: `.github/workflows/security.yml` enforces these checks.

### C. Incident Response Walkthrough
**Scenario**: "Show me an alert that triggered and how it was resolved."

1. **Pick an alert**:
   * Query the `compliance_alerts` table or `AlertManager` history.
2. **Trace to Resolution**:
   * Show the `AlertTriggered` timestamp.
   * Show the `AlertAcknowledged` timestamp (Calculate MTTA).
   * Show the `AlertResolved` timestamp (Calculate MTTR).
   * Verify against SLO (e.g., < 15 mins).

---

## 3. Pre-Selected "Golden Samples"

While auditors pick their own, these verified samples demonstrate the "Happy Path":

| Control | ID/Ref | Artifact Location | Notes |
|---------|--------|-------------------|-------|
| **Access** | `user-verified-01` | `evidence/samples/access_grant.json` | Standard RBAC grant |
| **Change** | `PR-1024` | `evidence/samples/pr_approval.json` | Clean CI + Approval |
| **Data** | `key-rotation-log` | `evidence/samples/kms_rotate.log` | Auto-rotation event |

---

## 4. Auditor "Challenge" Scripts

If an auditor asks "Prove to me that I can't delete this log", run:

```bash
# 1. Attempt Modification (Should Fail)
psql -c "UPDATE audit_access_logs SET action='forged' WHERE id='sample-id';"

# Expected Output:
# ERROR: permission denied for relation audit_access_logs
# OR
# ERROR: Trigger prevent_audit_log_modification failed
```
