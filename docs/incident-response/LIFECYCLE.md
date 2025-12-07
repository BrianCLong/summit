# Incident Lifecycle & Roles

## Overview
This document defines the lifecycle, severity levels, and roles for incident management within CompanyOS.

## Incident States

| State | Description | Trigger/Transition |
| :--- | :--- | :--- |
| **Suspected** | An anomaly or alert has been detected but not yet confirmed as an incident. | Automated alert, user report, or engineering hunch. |
| **Triage** | The incident is being assessed to determine severity and scope. | Incident Commander (IC) assignment. |
| **Investigating** | The team is actively diagnosing the root cause. | IC confirms incident valid. |
| **Mitigated** | The immediate impact has been stopped or reduced; root cause may persist. | Fix deployed, rollback, or workaround applied. |
| **Monitoring** | Watching the system to ensure mitigation holds and no regression occurs. | System stability verified for a defined period. |
| **Resolved** | The incident is closed. Postmortem pending. | Service restored to normal operation. |

## Severity Levels

| Level | Severity | Description | Response SLA |
| :--- | :--- | :--- | :--- |
| **SEV-1** | **Critical** | Major system outage, data loss, or security breach affecting many users. | **15 min** response. All hands on deck. |
| **SEV-2** | **High** | Significant feature broken, performance degradation, or partial outage. | **30 min** response. Dedicated team. |
| **SEV-3** | **Medium** | Minor bug, non-critical feature issue, or internal tool failure. | **4 hours** response. Business hours. |
| **SEV-4** | **Low** | Cosmetic issue, minor annoyance, or technical debt identified. | Next sprint / Backlog. |

## Roles & Responsibilities

### Incident Commander (IC)
*   **Responsibility:** Leader of the incident response. Makes the final call on decisions.
*   **Actions:** Declares severity, assigns roles, manages the timeline, coordinates communication.
*   **Goal:** Resolve the incident as fast as possible.

### Scribe
*   **Responsibility:** Documentation and record-keeping.
*   **Actions:** Maintains the incident log, records decisions, tracks follow-up items.
*   **Goal:** Ensure a high-fidelity record for the postmortem.

### Communications Lead (Comms)
*   **Responsibility:** Internal and external stakeholder updates.
*   **Actions:** Updates status page, drafts emails, briefs executives.
*   **Goal:** Keep stakeholders informed and manage expectations.

### Subject Matter Experts (SMEs)
*   **Responsibility:** Technical investigation and resolution.
*   **Actions:** diagnose logs, write code patches, execute runbooks.
*   **Goal:** Fix the broken system.
