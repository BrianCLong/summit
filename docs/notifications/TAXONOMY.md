# Notification & Alerting Taxonomy v0

This document defines the classification, priority, and routing logic for all system notifications in CompanyOS.

## 1. Notification Types

Notifications are categorized by their business purpose. Each type has specific behavior regarding urgency, routing, and persistence.

| Category | Type Name | Description | Default Channel | Persistence |
|----------|-----------|-------------|-----------------|-------------|
| **Operational** | `Alert` | System health issues, performance degradation, errors. | PagerDuty, Slack, Email | Yes |
| **Operational** | `SLO Violation` | Breach of Service Level Objectives (Error Budget depleted). | PagerDuty, Slack | Yes |
| **Security** | `Policy Violation` | Breach of security or compliance policy (e.g., unauthorized access). | Slack (Security), Email | Yes (Audit) |
| **Governance** | `Approval Required` | Request for human authorization (Two-Person Control). | Email, Slack (DM) | Yes |
| **Governance** | `Audit Event` | Critical state change requiring audit trail (silent). | None (Log only) | Yes (WORM) |
| **Information** | `Status Update` | Progress of long-running jobs (Pipeline success/fail). | Slack, Webhook | No |
| **Information** | `Digest` | Periodic summary of non-critical activity. | Email | No |
| **Social** | `Mention` | Direct user mention in a comment or document. | Slack (DM), In-App | Yes |

## 2. Priority Levels

Severity determines the *speed* and *intrusiveness* of the notification.

| Level | Name | SLA (Time-to-Ack) | Intended Audience | Example |
|-------|------|-------------------|-------------------|---------|
| **CRITICAL** | P1 | 15 minutes | On-Call Engineers, Execs (if prolonged) | Database down, Data leak detected. |
| **HIGH** | P2 | 1 hour | Team Leads, Security Team | API Latency > 2s, Policy Violation. |
| **MEDIUM** | P3 | 4 hours | Feature Owners | Pipeline failed, Non-critical bug. |
| **LOW** | P4 | Next Business Day | Individual Contributors | PR comment, Task assignment. |
| **INFO** | P5 | None | Subscribers | Weekly digest, Login notification. |

## 3. Destinations & Routing

### Destinations
*   **In-App**: The "Notification Bell". Persistent, historical view.
*   **Email**: For asynchronous updates, digests, and formal records (approvals).
*   **SMS**: STRICTLY for CRITICAL (P1) operational alerts outside business hours.
*   **Push**: Mobile app notifications for urgent approvals or P1/P2 alerts.
*   **Chat**: Team channels (Operational/Info) or Direct Messages (Approvals/Mentions).
*   **Webhook**: For external system integration (e.g., triggering a remediation workflow).

### Routing Logic
1.  **Tenant Scope**: All notifications are scoped to a `tenantId`. Data never crosses tenant boundaries.
2.  **Role-Based**:
    *   *Security Events* -> `Security Admin` role.
    *   *Billing Events* -> `Finance Admin` role.
3.  **Team-Based**:
    *   *Service Alerts* -> Team owning the `serviceId` tag.
4.  **Escalation**:
    *   If P1 alert is not acknowledged within 15m -> Escalate to Manager.
    *   If Manager not acknowledged within 30m -> Escalate to VP/Director.

## 4. Suppression & Deduplication

To prevent alert fatigue, the following rules apply:

*   **Deduplication**: Identical alerts (same `fingerprint`) within `15 minutes` are grouped into a single notification with a count.
*   **Flapping Suppression**: If an alert toggles state > 3 times in 10 minutes, silence for 1 hour and send a summary.
*   **Maintenance Windows**: All "Operational" alerts are suppressed if the entity is in a registered maintenance window.
*   **Dependency Cascades**: If a core service (e.g., Database) is down, suppress alerts from dependent services (e.g., API) to focus on the root cause.
