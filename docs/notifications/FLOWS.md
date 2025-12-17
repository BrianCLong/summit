# Example Notification Flows

## Scenario 1: Critical Service Incident (Operational)

**Trigger**: The `PaymentService` experiences 500 error rates > 5% for 2 minutes.

1.  **Event Generation**:
    *   Monitor emits event: `type: ALERT_TRIGGERED`, `severity: CRITICAL`, `service: payments`.
    *   Fingerprint: `alert-payments-high-error-rate`.

2.  **Notification Hub Processing**:
    *   **Enrichment**: Hub looks up service owner -> `Team FinTech`.
    *   **Deduplication**: Checks Redis. No active alert for this fingerprint.
    *   **Routing**:
        *   `Team FinTech` On-Call rotation -> `User: Alice`.
        *   Channel Policy for CRITICAL: `PagerDuty` + `Slack #fintech-alerts`.

3.  **Delivery**:
    *   **PagerDuty**: Triggers incident for Alice. (SMS/Phone Call depending on her settings).
    *   **Slack**: Posts message to `#fintech-alerts`:
        > 🚨 **CRITICAL: Payment Service High Error Rate**
        > Error rate is 7.2% (Threshold: 5%).
        > [View Dashboard] [Runbook] [Ack]

4.  **Escalation (if needed)**:
    *   Alice does not Ack within 15 mins.
    *   Hub triggers Escalation Rule.
    *   Next on-call (`User: Bob`) is paged.

## Scenario 2: Policy Violation (Security)

**Trigger**: `User: Dave` attempts to download the entire Customer Database (Action: `BulkExport`, Resource: `CustomerDB`).

1.  **Event Generation**:
    *   Data Access Layer emits: `type: POLICY_VIOLATION`, `severity: HIGH`.
    *   Context: `user: dave`, `action: bulk_export`.

2.  **Notification Hub Processing**:
    *   **Enrichment**: Lookup Security Team distribution list.
    *   **Routing**:
        *   Target: `Role: SecurityAdmin`.
        *   Target: `User: Dave` (Manager of).

3.  **Delivery**:
    *   **Email** (to Security Team): "High Severity Security Alert: Unusual Data Access".
    *   **Slack** (DM to Security Bot): Alerts the on-duty security analyst.
    *   **Email** (to Dave's Manager): "Your direct report triggered a security alert."

4.  **Audit**:
    *   Event is written to `audit_log` (WORM storage).

## Scenario 3: Deployment Approval (Governance)

**Trigger**: `User: Eve` triggers a deployment to `Production`.

1.  **Event Generation**:
    *   CI/CD Pipeline emits: `type: AUTHORITY_APPROVAL_REQUIRED`.
    *   Context: `pipeline: api-deploy`, `env: production`.

2.  **Notification Hub Processing**:
    *   Policy requires "Two-Person Control".
    *   **Routing**: Finds eligible approvers (e.g., `Group: TechLeads`). Excludes `User: Eve` (cannot approve own change).

3.  **Delivery**:
    *   **Slack** (DM to Approvers):
        > 🔒 **Approval Request: Production Deployment**
        > Eve requests deployment of `api-service:v2.1`.
        > [Approve] [Reject] [View Changes]
    *   **Email**: Sent to the change management mailing list.

4.  **Action**:
    *   `User: Frank` clicks [Approve] in Slack.
    *   Hub receives callback, verifies permissions.
    *   Emits `WORKFLOW_APPROVED`.
    *   Notifies Eve: "Frank approved your deployment."
