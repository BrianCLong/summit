# Trust Feedback Taxonomy & Routing Rules

## Overview
This document defines how trust-related feedback is classified, routed, and escalated. The goal is to ensure no signal of trust erosion is lost in general support noise.

## Classification Taxonomy

All customer feedback (tickets, surveys, sales notes) must be tagged with a **Primary Category** and, if applicable, a **Trust Dimension**.

### Primary Categories

1.  **Defect:** System not working as designed.
2.  **Feature Request:** Desired new functionality.
3.  **Trust Erosion:** Feedback indicating a breach of expectation, safety, or honesty.
4.  **Question:** Generic inquiry.

### Trust Dimensions (Tags)

If **Trust Erosion** is selected, one of the following tags is **mandatory**:

*   `trust:truth` - Mismatch between docs/sales and reality.
*   `trust:reliability` - Unpredictable performance or silence during failure.
*   `trust:governance` - Concerns about data safety, privacy, or autonomy.
*   `trust:transparency` - Confusing, misleading, or hidden communication.

## Severity Levels

| Level | Definition | Example | SLA |
| :--- | :--- | :--- | :--- |
| **Sev-1 (Critical)** | Existential threat to trust. Viral potential. | "Summit deleted my data without warning" or "AI acted autonomously outside bounds". | 1 Hour (Exec Notify) |
| **Sev-2 (High)** | Significant mismatch affecting key workflow. | "Docs say encryption is on, but settings show off." | 24 Hours |
| **Sev-3 (Medium)** | Confusing behavior or minor doc error. | "This error message is blaming me but it's a 500." | 3 Days |
| **Sev-4 (Low)** | Nits, typos, minor clarity issues. | "Typo in the privacy policy." | Backlog |

## Routing Rules

| Tag | Primary Owner | Secondary Owner |
| :--- | :--- | :--- |
| `trust:truth` | **Docs Lead** | Product Manager |
| `trust:reliability` | **SRE Lead** | Engineering Manager |
| `trust:governance` | **CISO / Security Lead** | Legal |
| `trust:transparency` | **Head of Comms** | Product Marketing |

## Escalation Paths

### The "Trust Red Button"
Any employee who identifies a **Sev-1** trust issue has the authority and obligation to:
1.  Page the On-Call Incident Commander.
2.  Post in `#trust-alerts` (Slack).
3.  The Incident Commander *must* treat it as a P0 incident until triage proves otherwise.

### Routine Escalation
*   **Support Tier 1:** Triage and tag.
*   **Support Tier 2:** Verify "Trust" classification. Route to owner via Jira/Linear.
*   **Owner:** Must acknowledge Sev-2 within 24 hours with a resolution plan.
*   **Stalled Items:** Any `trust` ticket open > 14 days is automatically flagged to the VP of Engineering.

## Integration Points

*   **Jira/Linear:** Custom field `TrustDimension`.
*   **Slack:** `#feed-trust-signals` receives a stream of all `trust:*` tagged items (anonymized).
*   **Risk Register:** Monthly sync from `trust:governance` tickets to the Corporate Risk Register.
