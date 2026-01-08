# Runbook: [Alert Name]

**ID:** [Alert ID]
**Service:** [Service Name]
**Severity:** [Severity]
**Owner:** [Owner]
**SLO Impact:** [SLO Reference]

---

## 1. Detection

- **Trigger:** [PromQL expression or description of what triggered this]
- **Threshold:** [Value/Duration]
- **Dashboards:** [Links to relevant Grafana dashboards]
- **Traces:** [Link to Jaeger/Tempo search query]

## 2. Triage

- **Impact:** [What is broken? User impact?]
- **Urgency:** [Immediate/Next Business Day]
- **Dependencies:** [Upstream/Downstream services]

## 3. Diagnostics

- **Check logs:** `kubectl logs -l app=[service] --tail=100`
- **Check pods:** `kubectl get pods -l app=[service]`
- **Check metrics:** [PromQL queries to run]

## 4. Autoremediation (if applicable)

- **Script:** `[Path to script]`
- **Verification:** `[Command to verify script ran]`
- **Manual Trigger:** `[Command to manually run script]`

## 5. Mitigation / Manual Steps

1.  [Step 1]
2.  [Step 2]
3.  [Step 3]

## 6. Rollback

- If a deployment caused this, rollback: `[Rollback command]`

## 7. Verification

- How to confirm the issue is resolved?
- **Success Criteria:** [Metric < Threshold]

## 8. Escalation

- **Primary:** [Team Name]
- **Secondary:** [Manager/SRE]

## 9. Post-Incident

- Create a ticket/issue.
- Update this runbook if steps were missing.
