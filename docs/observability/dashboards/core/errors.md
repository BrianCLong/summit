# Errors Dashboard Spec

**Goal:** Visualizes service reliability and failure modes.

## Panels

### 1. Global Error Rate (Line Chart)

- **Metric:** `http_requests_total{status=~"5.."}` / Total Requests.
- **Dimensions:** `service_name`.
- **Y-Axis:** Percentage (%).
- **Thresholds:**
  - Warning: > 1% (SLO dependent).
  - Critical: > 5%.

### 2. Error Breakdown by Code (Stacked Bar)

- **Metric:** Count of requests by status code.
- **Filter:** Status >= 400.
- **Dimensions:** `status_code`, `method`.
- **Goal:** Differentiate between 4xx (client) and 5xx (server) errors.

### 3. Error Rate by Route (Multi-Line or Table)

- **Metric:** Error rate per endpoint.
- **Goal:** Pinpoint problematic handlers.

### 4. Recent Logs with Error Level (Log Stream)

- **Source:** Log aggregation (Loki/Elastic).
- **Filter:** `level="error"` OR `level="critical"`.
- **Limit:** Last 20 lines.
