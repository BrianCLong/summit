# Incident Severity & Taxonomy

This document defines the severity levels and taxonomy for incidents within the IntelGraph/Summit ecosystem. It serves as the source of truth for classifying, prioritizing, and responding to operational events.

## Incident Taxonomy

Incidents are categorized into the following types to ensure they are routed to the correct subject matter experts.

| Type               | Description                                                                   | Examples                                                                   | Owner            |
| :----------------- | :---------------------------------------------------------------------------- | :------------------------------------------------------------------------- | :--------------- |
| **Security**       | Threats to confidentiality, integrity, or availability of the system or data. | Unauthorized access, key compromise, potential RCE, injection attack.      | Security Ops     |
| **Reliability**    | Issues affecting system uptime, latency, or error rates.                      | 5xx errors, high latency, database outage, network partition.              | SRE / DevOps     |
| **Governance**     | Violations of compliance policies, audit failures, or unauthorized changes.   | Policy bypass, missing audit logs, unapproved deployment.                  | Compliance Lead  |
| **Data**           | Data corruption, loss, leakage, or privacy violations.                        | PII exposure, database corruption, accidental deletion, retention failure. | Data Engineering |
| **Agent Behavior** | Autonomous agents acting outside of expected parameters or budget.            | Infinite loops, budget exhaustion, hallucinations causing critical errors. | AI/ML Ops        |

## Severity Levels

Severity levels determine the urgency and resource allocation for an incident.

### SEV0: Critical / Catastrophic

**Definition:** Complete system outage, massive data breach, or critical loss of control over autonomous agents. Immediate business threat.

- **Criteria:**
  - System completely unavailable (GLOBAL).
  - Confirmed active data exfiltration of critical/sensitive data.
  - Agent "runaway" consuming all resources or performing destructive actions at scale.
  - Fundamental security control (e.g., AuthZ) failure.
- **Response:**
  - **SLA:** Immediate (< 5 mins acknowledgment).
  - **Actions:** Activate War Room. Mobilize all leads. Consider **Global Kill-Switch**.
  - **Notification:** Exec team, Legal (if data/security), Customers (if public impact).
  - **Approval:** CTO/CISO for major remediation (unless pre-approved automated defense).

### SEV1: High / Major

**Definition:** Major functionality broken, significant performance degradation, or contained security incident.

- **Criteria:**
  - Core feature unavailable (e.g., cannot start new Runs).
  - High latency making system unusable for >10% of users.
  - Budget exhaustion for a major tenant.
  - Single-tenant data exposure or isolation breach.
- **Response:**
  - **SLA:** < 15 mins acknowledgment.
  - **Actions:** Dedicated Incident Commander. fix-forward or rollback.
  - **Notification:** Engineering Leads, affected Tenant Admins.
  - **Approval:** Engineering Manager for non-standard changes.

### SEV2: Medium / Moderate

**Definition:** Partial functionality broken, minor performance impact, or near-miss event.

- **Criteria:**
  - Non-critical feature broken (e.g., reporting delay).
  - Intermittent errors (< 1% rate).
  - Policy violation blocked but flagged as high-risk.
  - Agent behaving inefficiently but safely.
- **Response:**
  - **SLA:** < 1 hour acknowledgment.
  - **Actions:** Assign to on-call engineer. Fix within business day or next shift.
  - **Notification:** Team channel.

### SEV3: Low / Minor

**Definition:** Minor bug, cosmetic issue, or confusing behavior with no functional impact.

- **Criteria:**
  - UI glitch.
  - Documentation error during incident.
  - False positive alert (low noise).
- **Response:**
  - **SLA:** Next business day.
  - **Actions:** Ticket for backlog or next sprint.
  - **Notification:** None / Ticket updates.

## Required Actions Mapping

| Severity | Kill-Switch Usage                                                | Notifications                                              | Approval Requirements                                                   |
| :------- | :--------------------------------------------------------------- | :--------------------------------------------------------- | :---------------------------------------------------------------------- |
| **SEV0** | **Authorized.** May use Global Kill-Switch if containment fails. | **All Hands.** Execs, Legal, External status page.         | **Post-Action.** Immediate action allowed to save system; verify later. |
| **SEV1** | **Restricted.** Feature/Tenant Kill-Switch only.                 | **Stakeholders.** Internal leadership, affected customers. | **Peer Review.** Fast-track PR review required for config changes.      |
| **SEV2** | **No.** Use standard rollback.                                   | **Team.** Ops channel updates.                             | **Standard.** Normal PR process.                                        |
| **SEV3** | **No.**                                                          | **None.**                                                  | **Standard.** Normal PR process.                                        |
