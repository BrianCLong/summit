# Public Assurance Language & Disclaimer Pack

This document provides the standard copy and disclaimers to be used on all public trust dashboards and reports.

## 1. Global Disclaimer (Footer/Header)

> "This dashboard displays automated signals from Summit's internal control plane. Metrics are aggregated to protect sensitive data and system security. Past performance does not guarantee future results. Availability metrics exclude planned maintenance windows."

## 2. Metric-Specific Disclaimers

### Availability & Uptime

> "Availability is calculated based on successful synthetic probes against our core API endpoints. It reflects the experience of a typical user but may not capture all edge cases or regional ISP issues."

### Incident Counts

> "Incident counts reflect confirmed, customer-impacting events classified as Severity 1 (Critical) or Severity 2 (High). Lower severity anomalies and internal near-misses are excluded to focus on material impact."

### Compliance Status

> "Certification status is verified against our latest audit reports. 'Active' means the certification is current. 'Pending' indicates an audit is in progress or under review."

### Documentation Accuracy

> "Documentation accuracy is an automated score based on the alignment between our API specifications (OpenAPI) and the deployed codebase. It does not measure the clarity or prose quality of the documentation."

## 3. Data Freshness Labeling

All data points must be accompanied by a timestamp or freshness indicator:

- "Real-time (updated < 15m ago)"
- "Daily (updated at 00:00 UTC)"
- "Audit Cycle (updated quarterly)"

## 4. Failure State Messaging

If the dashboard cannot load data:

> "Trust signals are currently unavailable due to a monitoring system issue. This does not necessarily indicate a platform outage. Please check status.summit.com for operational updates."
