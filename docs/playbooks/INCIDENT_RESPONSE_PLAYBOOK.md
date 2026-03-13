# Summit Incident Response Playbook

This playbook provides a comprehensive, operator-executable guide for managing incidents in the Summit environment from detection through post-incident review. Designed for solo on-call engineers, it requires no prior Summit-specific knowledge.

---

## 1. Incident Severity Classification

When an alert triggers or an issue is reported, classify it using the following severity definitions.

| Severity | Description | Response SLA | Target Update Cadence |
| :--- | :--- | :--- | :--- |
| **SEV-1** | **Complete outage or data loss.** Broad customer impact, core user journeys unavailable, or security incidents requiring immediate response. | **<15 min** | Every 15 minutes |
| **SEV-2** | **Degraded service or SLO breach.** Partial impact, key features degraded, or error budget burn >25% in a day. | **<30 min** | Every 30 minutes |
| **SEV-3** | **Minor degradation, no SLO breach.** Limited or single-tenant impact, reliable workarounds exist. | **<4h** | Hourly |
| **SEV-4** | **Cosmetic or low-impact issue.** Early warnings, UI glitches, or follow-up tasks. | **<24h** | As needed (Async) |

---

## 2. Detection and Alert Response

### 2.1 Receiving and Acknowledging an Alert
1. **Receive:** Alerts arrive via PagerDuty, Slack (`#incidents`), or customer support escalation.
2. **Acknowledge:** Acknowledge the alert in PagerDuty immediately to stop escalation.
3. **Claim:** Announce in the `#incidents` Slack channel: "I am acknowledging alert [Alert Name] and acting as Incident Commander (IC)."

### 2.2 First 5 Minutes Checklist
1. **Stabilize:** Run `scripts/ops/new-incident.sh "<short title>"` to generate the incident doc. Paste the doc link in `#incidents`.
2. **Assess:** Check Grafana SLO dashboards, CloudWatch logs, and standard health endpoints (e.g., `curl -s http://localhost:4000/health/detailed | jq .`) to confirm the alert's validity and scope of impact.
3. **Communicate:** Post an initial acknowledgement on the internal status channel and, if user-facing (SEV-1/SEV-2), update the external status page. (See Section 6).

### 2.3 Determining Severity
Evaluate the scope:
* Are core operations (e.g., API access, frontend) completely down? -> **SEV-1**
* Is the system up but a major component (e.g., GraphQL endpoint, Neo4j DB) failing? -> **SEV-2**
* Is the issue isolated to a non-critical background job or a single user? -> **SEV-3**
* Upgrade the severity if the issue is rapidly worsening or causing data corruption.

---

## 3. Triage Procedures per Subsystem

If the alert does not specify the root cause, determine the failing subsystem and follow the triage procedures below.

### 3.1 Evidence Pipeline Failures
* **Symptoms:** Builds failing at the evidence generation step; compliance reports missing.
* **Triage:**
  1. Check the Evidence Governor logs: `node scripts/repoos/evidence-governor.mjs` (or check CI output).
  2. Validate evidence contracts: `scripts/determinism/validate_evidence_contracts.py`.
  3. Ensure timestamps in `evidence/` schemas are strictly ISO-8601 UTC.
* **Quick Fix:** Re-run the specific workflow or manually trigger the evidence generator.

### 3.2 CI Gate Failures
* **Symptoms:** Pull requests blocked; tests failing globally.
* **Triage:**
  1. Inspect the failing GitHub Action workflow logs.
  2. Verify if the failure is related to new policy checks.
  3. Run `pnpm test:quick` locally to replicate the issue.
* **Quick Fix:** Revert the offending PR or temporarily adjust the failing policy strictly following governance guidelines.

### 3.3 Deploy Failures
* **Symptoms:** Blue/Green deployment stalled; production environment out of sync.
* **Triage:**
  1. Check deployment validations: `scripts/deploy/pre-deploy-checklist.sh`.
  2. Review Kubernetes/Docker metrics: `kubectl logs -f deployment/intelgraph-server -n intelgraph` or `docker compose logs -f --tail=100 intelgraph-server`.
  3. Verify environment variables and network connectivity using `scripts/deploy/validate-environment.sh`.
* **Quick Fix:** Trigger the automated rollback script: `./scripts/auto-rollback.sh`.

### 3.4 Governance / Branch Protection Failures
* **Symptoms:** Authorized merges blocked; meta-governance locks triggering incorrectly.
* **Triage:**
  1. Identify the failing policy in `.repoos/` (e.g., `meta-governance-lock.yml`).
  2. Confirm required approvals in `.github/CODEOWNERS`.
  3. Check the decision audit logs for the block reason.
* **Quick Fix:** In emergency scenarios requiring bypass, execute the documented Break-Glass procedures (Section 5.3) to bypass governance. This requires Incident Commander authorization and will be heavily audited.

### 3.5 RepoOS / Entropy Monitor Failures
* **Symptoms:** Homeostasis controller failing; RepoOS control console reporting degraded health.
* **Triage:**
  1. Launch the unified control console: `node scripts/repoos/repoos-console.mjs` to view system health.
  2. Check the stability envelope: `node scripts/repoos/stability-envelope-monitor.mjs`.
  3. Review the Frontier Entropy monitor logs: `summit automation log` or review `scripts/repoos/format-entropy-output.mjs`.
* **Quick Fix:** Restart the Homeostasis controller or temporarily increase the agent budget if limits are excessively throttling operations.


---

## 4. Escalation Matrix

If you are the solo on-call engineer, you are the **Incident Commander (IC)** until explicitly relieved. If the incident scope exceeds your technical capacity or is SEV-1/SEV-2, you must escalate according to this matrix.

| Severity / Condition | Subsystem | Action / Who to Page | Contact Method |
| :--- | :--- | :--- | :--- |
| **Any SEV-1** | All | Executive On-Call, Core Engineering Manager | PagerDuty (Escalation Policy: `Summit-Critical`) |
| **SEV-2 / Prolonged Outage** | Infrastructure/Ops | `@team-ops` | Slack `#ops-escalations` or PagerDuty |
| **SEV-2 / Security Breach** | Security/Governance | `@intelgraph-security` | PagerDuty (Security Response) |
| **Database Failure / Data Loss** | Core Platform | `@intelgraph-data` | Slack `#data-engineering-alerts` |
| **CI/Deploy Complete Failure** | Infrastructure/Ops | `@team-ops`, `@BrianCLong` | PagerDuty / Slack |
| **SEV-3 / SEV-4** | Specific Service | Consult `.github/CODEOWNERS` | Slack Service Channel or Jira Ticket |

---

## 5. Mitigation Patterns

When an incident is confirmed, focus entirely on mitigating the impact and restoring service. Root cause analysis comes later during the Post-Incident Review. Apply these common mitigation patterns based on the scenario.

### 5.1 Rollback Procedures
* **When to use:** A recent deployment or configuration change caused a SEV-1/SEV-2 incident.
* **Execution:**
  1. Trigger the automated rollback script: `./scripts/auto-rollback.sh`.
  2. For Kubernetes environments, execute: `kubectl rollout undo deployment/intelgraph-server -n intelgraph`.
  3. Confirm the rollback was successful by checking the endpoint health: `curl -s http://localhost:4000/health/detailed | jq .`.
  4. Communicate the rollback status in `#incidents`.

### 5.2 Feature Flag Kill-Switch
* **When to use:** A newly rolled-out feature is causing errors or performance degradation but a full environment rollback is not feasible or necessary.
* **Execution:**
  1. Check feature flags managed in `summit/flags.py`.
  2. Update the environment variable corresponding to the feature (e.g., `export SUMMIT_FEATURE_X=false`) or toggle the flag via the admin console if available.
  3. Monitor `http_requests_total` and latency metrics via the unified RepoOS console (`node scripts/repoos/repoos-console.mjs`) to verify the error rate drops.

### 5.3 Manual CI Bypass Procedure & Governance Requirements (Break-Glass)
* **When to use:** Emergency hotfixes are blocked by CI/Governance gates (e.g., meta-governance locks in `.repoos/meta-governance-lock.yml`), and waiting for standard approvals would violate the SEV-1/SEV-2 SLA.
* **Execution:**
  1. **Declaration:** The Incident Commander explicitly authorizes a "break-glass" procedure in the incident doc, recording the justification (nature of incident, impact, and why standard procedures are insufficient).
  2. **Activation:** Execute the break-glass activation script: `curl -X POST $AUTHZ_ADMIN/break-glass/grant ...` (with `BREAK_GLASS=1`) or use the UI/CLI equivalent if provisioned.
  3. **Operation:** Perform the required mitigation (e.g., merge a hotfix PR directly or update production credentials). The system will append events to `break-glass-events.log` and the action will be audited.
  4. **Revocation & Audit:** Once mitigated, manually revoke access if it doesn't auto-expire, and ensure the Security Officer conducts a thorough review of the entire break-glass event during the Post-Incident Review. All actions must comply with the `docs/runbooks/BREAK_GLASS_ACCESS.md` policies.

---

## 6. Communication Templates

Effective communication is critical during an incident. Use the following templates for the internal Slack channels (e.g., `#status`, `#incidents`) and external status pages. The Incident Commander (or Scribe) is responsible for updates based on the target cadence in Section 1.

### 6.1 Status Page / External Update
**Subject:** [Degraded Performance / Outage] - [Affected Service/Feature]
**Body:**
We are currently investigating an issue impacting [affected service/feature, e.g., the API Gateway]. Some users may experience [symptoms, e.g., elevated error rates or latency]. Our engineering team is actively investigating the root cause.
* **Next Update:** Within [15/30] minutes.

### 6.2 Internal Stakeholder Notification (Slack `#status`)
**Subject:** SEV-[1/2/3/4] Update: [Short Title]
**Body:**
* **Status:** [Investigating / Identified / Monitoring / Mitigated]
* **Impact:** [Brief description of what is failing and the blast radius]
* **Current Action:** [What the on-call engineer/team is currently doing]
* **Incident Commander:** [@YourHandle]
* **Incident Doc:** [Link to Doc]
* **Next Update:** [Time in UTC]

### 6.3 All-Clear Message
**Subject:** [Resolved] - [Affected Service/Feature]
**Body:**
* **Status:** Resolved
* **Summary:** The issue affecting [service] has been fully mitigated. All systems are operating normally.
* **Mitigation:** [Brief 1-sentence description of the fix, e.g., "A database connection pool configuration was updated and the service rolled back."]
* **Next Steps:** A Post-Incident Review (PIR) will be conducted and shared within 5 business days. Thank you for your patience.

---

## 7. Post-Incident Review (PIR) Process

A Post-Incident Review (PIR) must be completed for every SEV-1 and SEV-2 incident within 5 business days. The Incident Commander coordinates the PIR, focusing on continuous improvement rather than blame.

### 7.1 Timeline Reconstruction
Reconstruct the sequence of events using UTC timestamps inside the incident doc. Key milestones to capture:
* **T0 (Detection):** When the alert triggered or the issue was first reported.
* **T+X (Triage & Acknowledgment):** When the incident was declared and IC assigned.
* **T+Y (Mitigation Attempt 1):** Detail what was done and if it succeeded or failed.
* **T+Z (Mitigation Success):** When the issue was successfully resolved.
* **T+Resolution:** The time the all-clear was communicated.

### 7.2 Contributing Factors
Identify what caused the incident. Avoid stopping at "human error." Analyze:
1. **Trigger:** The specific action or event that initiated the failure (e.g., a PR merge, traffic spike).
2. **Vulnerability/Design Flaw:** The underlying system weakness that allowed the trigger to cause an outage (e.g., lack of rate limiting, missing CI test).
3. **Detection Delay:** Why wasn't the issue caught sooner in CI or staging?

### 7.3 Action Items Format
Ensure every action item resulting from the PIR is actionable, assigned, and tracked. Format action items as follows:
* **Task Description:** [Clear statement of the work to be done]
* **Priority:** [P0, P1, P2]
* **Owner:** [@Handle]
* **Due Date:** [YYYY-MM-DD]
* **Jira/Issue Link:** [URL]

*Examples:*
* P0: Create an alert for high error rate on `/api/graphql`. (Owner: @team-ops, Due: Next sprint)
* P1: Add integration test to validate the cache invalidation logic. (Owner: @intelgraph-core, Due: Next sprint)
