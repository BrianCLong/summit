# CompanyOS Analytics Model v0

**Mission:** Provide customers with trustworthy analytics and reporting: operational dashboards, compliance reports, and insight surfaces built on top of the Data Spine and Intelligence Fabric.

## 1. Analytics Domains

We define four core subject areas for CompanyOS analytics.

### Core Subject Areas

1.  **Operations Health**
    - **Focus:** System stability, performance, and resource utilization.
    - **Key Metrics:** API Latency (p95, p99), Error Rates, Uptime, Resource Saturation (CPU, Memory, Disk), Throughput.
    - **Target Audience:** DevOps, SRE, Platform Engineers.

2.  **Reliability**
    - **Focus:** Service Level Objectives (SLOs) and incident management.
    - **Key Metrics:** SLO Burn Rate, MTTR (Mean Time To Recovery), MTBF (Mean Time Between Failures), Incident Count by Severity.
    - **Target Audience:** SRE, Engineering Managers.

3.  **Risk & Compliance**
    - **Focus:** Security posture, audit trails, and policy adherence.
    - **Key Metrics:** Policy Violation Count, Compliance Score (%), Open Vulnerabilities (by severity), Audit Gap Analysis, PII Access Logs.
    - **Target Audience:** CISO, Compliance Officers, Auditors.

4.  **Productivity**
    - **Focus:** Engineering velocity and delivery efficiency.
    - **Key Metrics:** DORA Metrics (Deployment Frequency, Lead Time for Changes, Change Failure Rate, Time to Restore Service), PR Cycle Time, Merge Frequency.
    - **Target Audience:** VP of Engineering, Engineering Managers, Product Managers.

### Standard Measures & Dimensions

All metrics across domains support the following standard dimensions:

- **Tenant:** `tenant_id` (Strict isolation)
- **Team:** `team_id` (Hierarchical aggregation)
- **Region:** `region` (Geographic distribution)
- **Feature/Service:** `service_name` or `feature_flag` context.

### Time-Grain & Freshness

- **Real-time (Operational Dashboards):**
  - Grain: 1 minute.
  - Freshness: < 30 seconds latency.
  - Retention: 24 hours (high resolution), then rolled up.
- **Hourly (Tactical Reporting):**
  - Grain: 1 hour.
  - Freshness: < 15 minutes latency.
  - Retention: 30 days.
- **Daily (Strategic/Executive Reporting):**
  - Grain: 1 day.
  - Freshness: Available by 08:00 UTC next day.
  - Retention: 1+ years (for trend analysis).

## 2. Reporting & Dashboard Patterns

### Default Dashboards by Persona

#### 1. Operations & Engineering (The "Cockpit")

- **Goal:** Immediate situational awareness and rapid troubleshooting.
- **Key Visuals:**
  - Traffic/Error/Latency (RED method) sparklines per service.
  - Resource heatmaps (identifying hot nodes/pods).
  - Live log stream tail for error severity > warning.
- **Interactivity:** Click-to-drill from spike to trace.

#### 2. Risk & Compliance (The "Ledger")

- **Goal:** Prove control and identify gaps.
- **Key Visuals:**
  - Compliance Controls Status (Green/Red/Amber matrix).
  - Policy Violation Trend over 30 days.
  - Drill-down table of specific audit events (Who, What, When).
  - "Evidence Export" button for SOC2/ISO audits.

#### 3. Executive (The "Pulse")

- **Goal:** High-level health and ROI visibility.
- **Key Visuals:**
  - Reliability Score (SLO aggregate).
  - Security Risk Score (aggregated vulnerability/incident data).
  - Engineering Velocity Trend (DORA summary).
  - Cost/Usage trend vs Budget.

### Custom Reporting Capabilities

- **Builder:** Drag-and-drop metric builder allowing users to mix measures from supported domains.
- **Filters:** Global context filters (Date Range, Tenant, Environment).
- **Saved Views:** Private and Shared dashboard configurations.
- **Exports:** CSV, PDF, and API access to underlying data frames.

### Guardrails against Misinterpretation

- **Confidence Bands:** Where applicable (e.g., anomaly detection), show 95% confidence intervals.
- **Caveats & Annotations:** Automatic footnotes for data gaps (e.g., "Maintenance Window: Data may be incomplete for 2023-10-27").
- **Data Freshness Indicators:** Every widget must display a "Last updated: X mins ago" timestamp.
- **Sample Rate Disclosure:** Clearly state if data is sampled (e.g., "Based on 10% trace sampling").

## 3. Data Quality & Trust Signals

### Data Validation & Reconciliation

- **Ingestion Validation:** Schema validation at the gate (Event -> Ingestion). Invalid events are dead-lettered and metered.
- **Reconciliation:** Daily "Gold Standard" jobs that compare aggregated metrics against raw event counts in the cold store/warehouse to ensure < 0.1% drift.

### Lineage & Drill-Downs ("Explain this Number")

- **Traceability:** Every aggregate metric in a dashboard must support a "Drill to Source" action.
  - Example: Clicking "500 Errors: 15" reveals the list of 15 specific `trace_id`s or `request_id`s.
- **Metadata:** Hovering over a metric label reveals:
  - Definition/Formula.
  - Source System.
  - Owner Team.

### Versioning

- **Metric Definitions:** Managed as code (e.g., YAML/JSON definitions). Changes to how a metric is calculated require a PR and trigger a version bump (e.g., `api_latency_v2`).
- **Change Logs:** A "What's New" widget on dashboards highlighting recent changes to metric definitions or data sources.

## 4. Production-Grade Checklist

A metric is considered **Production-Grade** only if:

- [ ] **Definition**: Unambiguously defined in the Metric Catalog (Code/YAML).
- [ ] **Ownership**: Has a designated Owner Team responsible for its accuracy.
- [ ] **SLO**: Has a defined freshness and availability SLO.
- [ ] **Lineage**: Can be drilled down to raw source events (or sampled representatives).
- [ ] **Validation**: Is covered by an automated reconciliation test (e.g., daily sum check).
- [ ] **Documentation**: Has user-facing tooltip text explaining "What this means" and "How to use it".
- [ ] **History**: Has at least 30 days of backfilled/historical data (if applicable).
- [ ] **Security**: Access control policies (RBAC) are defined and enforced (e.g., cost data restricted to Admins).

---

This document serves as the foundational agreement for the Analytics Fabric team's deliverables.
