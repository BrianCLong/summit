# Incident Response Playbook

**Status:** Draft
**Last Updated:** 2023-10-27
**Severity Levels:** SEV1 (Critical), SEV2 (High), SEV3 (Medium), SEV4 (Low)

## 1. Detection & Identification

**Goal:** Confirm if an event is a security incident.

*   **Sources:** PagerDuty alerts, User reports (Slack #support), Security scans (Trivy/Snyk).
*   **Action:**
    1.  Acknowledge alert within 15m (SEV1/2).
    2.  Verify impact (Is data leaking? Is service down?).
    3.  Declare Incident if confirmed: `/incident declare [title]` in Slack.

## 2. Triage & Mobilization

**Goal:** Assign roles and establish comms.

*   **Roles:**
    *   **Incident Commander (IC):** Coordinator (First responder usually).
    *   **Tech Lead:** Subject Matter Expert.
    *   **Comms Lead:** Updates stakeholders/users.
*   **Channels:**
    *   Slack: `#incident-[id]` (Created by bot).
    *   Video: Zoom link pinned in channel.

## 3. Containment & Eradication

**Goal:** Stop the bleeding.

*   **Strategies:**
    *   **Block Traffic:** Update WAF / Security Groups.
    *   **Revoke Access:** Rotate keys, suspend user accounts (`scripts/ops/suspend_user.ts`).
    *   **Rollback:** Revert deployment via ArgoCD/GitHub.
    *   **Isolation:** Quarantine compromised node/container.
*   **Preserve Evidence:** Take snapshots of logs/disk BEFORE wiping (if possible).

## 4. Recovery

**Goal:** Restore normal service.

*   **Action:**
    1.  Patch vulnerability.
    2.  Restore data from backup (if needed).
    3.  Restart services.
    4.  Verify health (observability dashboards).

## 5. Post-Incident Review (Post-Mortem)

**Goal:** Learn and prevent recurrence.

*   **Timeline:** Within 48 hours of resolution.
*   **Artifacts:**
    *   Timeline of events.
    *   Root Cause Analysis (5 Whys).
    *   Action Items (Jira tickets).
*   **Outcome:** Update this playbook, add regression tests, improve alerts.

## Contact List

*   **Security Officer:** security@companyos.io
*   **DevOps Lead:** [Internal Contact]
*   **Legal:** [Internal Contact]

## 6. Specific Component Checks

### Agent Runtime Health

To verify the health of the Agent Runtime during an incident:

1.  **Check Health Endpoint:**
    ```bash
    curl -f https://<runtime-service-url>/health
    ```
    Expected output: `{"status": "healthy", "details": {...}}`

2.  **Check Logs for Correlation IDs:**
    Look for `correlationId` in logs to trace specific requests.
    ```bash
    grep "correlationId" /var/log/agent-runtime.log
    ```
