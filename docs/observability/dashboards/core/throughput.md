# Throughput Dashboard Spec

**Goal:** Visualizes demand and traffic patterns.

## Panels

### 1. Request Rate (Line Chart)

- **Metric:** Rate of requests per second (RPS).
- **Dimensions:** `service_name`, `method`.
- **Aggregation:** `rate(http_requests_total[1m])`.

### 2. Throughput by Tenant/Consumer (Stacked Area)

- **Metric:** RPS grouped by `tenant_id` or `client_id`.
- **Goal:** Identify noisy neighbors or traffic spikes from specific sources.

### 3. Active Connections/Requests (Gauge/Line)

- **Metric:** Number of in-flight requests.
- **Goal:** Detect concurrency pile-ups.
