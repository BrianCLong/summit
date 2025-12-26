# Continuous Improvement Program

> **Status**: Active
> **Cadence**: Bi-Weekly
> **Owner**: Engineering Leadership

This document establishes the **Continuous Improvement Program** for Summit. The goal is to institutionalize excellence by turning hard-won practices into a permanent operating system that continuously improves Summit without heroics.

## Program Objectives

1.  **Reliability**: Maintain and improve system stability, uptime, and performance.
2.  **Security**: Proactively identify and mitigate vulnerabilities and threats.
3.  **Cost**: Optimize resource usage and unit economics.

## The Cadence

We operate on a **Bi-Weekly Continuous Improvement Cycle**. This is separate from product sprints and focuses purely on non-functional requirements and platform health.

| Event | Frequency | Owner | Output |
| :--- | :--- | :--- | :--- |
| **Reliability Review** | Bi-Weekly (Mon) | SRE Lead | [Reliability Report](../reports/reliability/), Updated SLOs |
| **Security Review** | Bi-Weekly (Wed) | Security Lead | [Security Report](../reports/security/), Vulnerability Triage |
| **Cost Review** | Monthly (1st Fri) | FinOps Lead | [Cost Report](../reports/cost/), Budget Adjustments |
| **Improvement Planning** | Bi-Weekly (Fri) | Eng Lead | Updated [Improvement Backlog](../IMPROVEMENT_BACKLOG.md) |

### Review Requirements

Each review must produce a specific artifact. No ad-hoc or "verbal only" reviews.

#### Reliability Review
*   **Inputs**: SLO dashboards, Incident logs, Post-mortems.
*   **Outputs**:
    *   SLO Compliance Status (Green/Yellow/Red).
    *   Error Budget Consumption.
    *   List of new action items for the Improvement Backlog.

#### Security Review
*   **Inputs**: Vulnerability scan results, Dependency audits, Access logs.
*   **Outputs**:
    *   Open Vulnerability Count (by severity).
    *   Triage decisions (Fix/Waive/Monitor).
    *   Compliance status.

#### Cost Review
*   **Inputs**: Cloud bill, Resource utilization reports, Unit cost metrics.
*   **Outputs**:
    *   Total Spend vs Budget.
    *   Cost per Unit (e.g., Cost per Request).
    *   Waste identification and reclamation targets.

## Metric Ownership

All critical metrics must have a named owner. See [Metric Ownership Registry](./METRIC_OWNERSHIP.md).

*   **No metric is unowned.** If a metric is important enough to measure, it must have a human responsible for it.
*   **Thresholds dictate action.** Every metric has a defined "Action Threshold". If crossed, an intervention is mandatory.

## Automated Regression Detection

We rely on automated gates to prevent backsliding.

*   **Reliability**: `performance-regression.yml` enforces p95 latency and bundle size limits.
*   **Security**: `security-scan.yml` blocks high-severity vulnerabilities and secret leaks.
*   **Cost**: Resource quotas and budget alerts are enforced via CI/CD and runtime monitoring.

**Rule**: No regression escapes detection. If a regression occurs in production that was not caught by CI, a test **must** be added to the CI pipeline as part of the remediation.

## Post-Incident & Learning

Every incident and significant change failure requires a standardized review.

*   **Template**: Use the [Post-Mortem Template](./templates/POST_MORTEM.md).
*   **Process**:
    1.  Draft post-mortem within 24 hours of resolution.
    2.  Review with the team within 3 days.
    3.  Convert "Preventative Actions" into tickets in the [Improvement Backlog](../IMPROVEMENT_BACKLOG.md).
    4.  Track to closure.

## Improvement Backlog

We maintain a dedicated [Improvement Backlog](../IMPROVEMENT_BACKLOG.md) separate from the product backlog to ensure technical debt and platform health are prioritized.

*   **Prioritization Rubric**:
    *   **P0 (Immediate)**: Security breach risk, imminent reliability collapse, massive cost overrun.
    *   **P1 (High)**: SLO breach, blocked feature velocity, significant waste.
    *   **P2 (Medium)**: Toil reduction, optimization, minor tech debt.

**Policy**: At least **20%** of engineering capacity in every sprint is reserved for items from the Improvement Backlog.
