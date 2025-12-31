# Customer Communication Strategy

## 1. Public vs. Private Communication

We maintain transparency while protecting sensitive details.

### Public Channels (Status Page)
*   **URL**: `https://status.summit-graph.io`
*   **Scope**: System-wide outages, maintenance, and global performance issues.
*   **Update Cadence**:
    *   **Investigating**: Initial post.
    *   **Identified**: Within 30 mins of triage.
    *   **Monitoring**: When fix is deployed.
    *   **Resolved**: Final confirmation.
*   **Who Updates**: Incident Commander.

### Private Channels (Email / Portal)
*   **Scope**: Tenant-specific issues, Breach Reports, Security Advisories.
*   **Audience**: Account Owners / Technical Contacts.
*   **Tool**: SendGrid / Intercom / Support Portal.

## 2. Notification Triggers

| Event | Channel | Template | SLA |
| :--- | :--- | :--- | :--- |
| **SEV-1 Outage** | Status Page | `status_page_outage` | < 15 mins |
| **SEV-2 Degradation** | Status Page | `status_page_degraded` | < 30 mins |
| **Maintenance** | Email + Status Page | `maintenance_notice` | > 48 hours notice |
| **SLA Breach** | Email (Affected) | `sla_breach_notice` | < 24 hours post-incident |

## 3. Communication Tone
*   **Empathetic**: Acknowledge the pain. "We understand this disrupts your workflow."
*   **Fact-Based**: No speculation. "We are investigating elevated error rates."
*   **Action-Oriented**: "Engineers are rolling back the recent deployment."
*   **No Blame**: Avoid blaming upstream providers unless confirmed and public (e.g., "AWS is reporting outages in us-east-1").

## 4. Post-Incident Review (PIR)
For all SEV-1 incidents, a public PIR is published to the Engineering Blog within 3 business days, detailing:
1.  What happened.
2.  Why it happened (5 Whys).
3.  What we are doing to prevent it.
