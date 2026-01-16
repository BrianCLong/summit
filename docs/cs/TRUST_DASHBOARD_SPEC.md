# Customer Trust Dashboard Specification

This document specifies the content and structure of the internal Customer Trust Dashboard. The dashboard provides a single, comprehensive view of a customer's health and engagement with the Summit Platform.

## Dashboard Structure

The dashboard will be generated in both Markdown (`.md`) and JSON (`.json`) formats. It will be organized into the following sections:

### 1. Header
- **Customer Name:** The name of the customer.
- **Tenant ID:** The customer's unique tenant identifier.
- **Generated At:** The timestamp of when the dashboard was generated.

### 2. Health Score
- **Overall Health Score:** The customer's current health score.
- **Factor Breakdown:** A table showing the score for each health factor, its weight, and the current value.

### 3. Renewal Risk
- **Risk Level:** The current renewal risk level (red, yellow, or green).
- **Risk Drivers:** The key factors contributing to the risk level.
- **Recommended Mitigations:** Suggested actions to mitigate the risk.

### 4. Key Metrics
- **SLO Compliance:** The current SLO compliance percentage.
- **Error Budget Burn:** The current error budget burn rate.
- **Version Drift:** The number of versions the customer is behind the latest release.
- **Security Exceptions:** The number of active security exceptions.
- **Incidents:** A summary of recent incidents.
- **Usage:** Key usage metrics (e.g., active users, queries).

## Data Sources

The data for the dashboard will be sourced from the following artifacts:
- `health.json`
- `renewal-risk.json`
- Other normalized metrics snapshots (e.g., usage, SLOs, incidents, security).
