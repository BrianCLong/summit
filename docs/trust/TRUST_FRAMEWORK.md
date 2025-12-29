# Customer Trust Metrics Framework

## Overview
This framework defines how Summit measures, analyzes, and acts upon customer trust. Trust is treated as an observable system property, not a sentiment. It is broken down into four key dimensions, each with specific leading and lagging indicators.

## Dimensions of Trust

### 1. Truth & Representation
**Definition:** Customers believe Summit behaves as documented and claimed. There are no surprises between demos, documentation, and reality.

*   **Signals:**
    *   **Documentation Discrepancy Reports:** Count of user feedback flagging docs as incorrect or outdated.
    *   **Demo-to-Production Mismatch:** Sales/CS reports of customers citing feature gaps post-purchase compared to pre-sales demos.
    *   **Clarification Requests:** Volume of support tickets asking "How does this actually work?" vs "It's broken".

*   **Measurement:**
    *   Automated: Tagging support tickets with `category:clarification` or `category:docs-mismatch`.
    *   Manual: Monthly review of "Closed Lost" or "Churn" reasons for "Product Fit" vs "Expectation Mismatch".

### 2. Reliability & Predictability
**Definition:** System availability meets expectations. Failures are rare, visible, and honest. Recovery is clear and timely.

*   **Signals:**
    *   **SLO Breaches:** Frequency and duration of SLO violations (Availability, Latency).
    *   **Incident Communication Satisfaction:** Post-incident survey scores (CSAT) specifically on *communication* quality, not just resolution time.
    *   **Silent Failures:** Count of bugs reported by customers that triggered no internal alerts (a major trust eroder).

*   **Measurement:**
    *   Automated: Prometheus metrics for SLOs.
    *   Manual: Post-mortem analysis of "Detection Source" (Customer vs. Monitoring).

### 3. Governance & Safety
**Definition:** Boundaries are respected. No perceived autonomy creep. Controls are visible when relevant.

*   **Signals:**
    *   **Privacy Inquiries:** Rate of questions regarding data usage, residency, or model training.
    *   **Access Control Confusion:** Tickets related to unexpected permission grants or denials.
    *   **Audit Log Access Frequency:** How often customers check their own audit logs (high frequency *can* imply distrust, or high utility).

*   **Measurement:**
    *   Automated: Usage metrics for the "Audit Log" and "Privacy Controls" pages.
    *   Manual: Legal/Compliance review of customer inquiries.

### 4. Transparency & Communication
**Definition:** Issues are communicated clearly. Language is precise and non-defensive. Changes are understandable.

*   **Signals:**
    *   **Changelog Engagement:** Click-through rates on release notes and changelogs.
    *   **Support Sentiment Analysis:** NLP analysis of ticket threads for "frustration", "confusion", or "mistrust".
    *   **Escalation Rate:** Percentage of tickets escalated due to "unsatisfactory answer" rather than technical complexity.

*   **Measurement:**
    *   Automated: Support tool analytics.
    *   Manual: Quarterly "Voice of the Customer" interviews.

## Measurement Methods & Cadence

| Metric | Source | Frequency | Owner |
| :--- | :--- | :--- | :--- |
| **Trust Score (Aggregate)** | Weighted average of dimensional scores | Monthly | Product |
| **Documentation Accuracy** | GitHub Issues / Feedback Widget | Real-time | Docs Team |
| **SLO Compliance** | Prometheus / Grafana | Real-time | Engineering |
| **Incident Comms CSAT** | Support / Status Page | Post-Incident | SRE / Comms |
| **Governance Usage** | Product Analytics | Weekly | Security Product |

## Closed-Loop Process

1.  **Signal Capture:** Signals are collected via Support, Product Analytics, and CRM.
2.  **Processing:** Signals are classified (see Feedback Taxonomy).
3.  **Review:** Monthly "Trust Review" with Engineering, Product, and CS leadership.
4.  **Action:**
    *   *Systemic:* Risk register update, roadmap item created.
    *   *Tactical:* Doc fix, immediate bug fix, direct customer outreach.
5.  **Validation:** Did the fix reduce the negative signal?
