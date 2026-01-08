# Latency Dashboard Spec

**Goal:** Visualizes how long requests take to process.

## Panels

### 1. P99/P95/P50 Latency (Line Chart)

- **Metric:** Request duration (histogram).
- **Dimensions:** `service_name`, `route`, `method`.
- **Aggregation:** `histogram_quantile(0.99, ...)`
- **Y-Axis:** Duration (ms/s).
- **Thresholds:**
  - Warning: > SLO target (e.g., 500ms).
  - Critical: > 2x SLO target.

### 2. Latency Heatmap

- **Metric:** Request duration (histogram buckets).
- **Dimensions:** Time.
- **Visualization:** Heatmap (Time vs. Duration Bucket).
- **Goal:** Identify outliers and multi-modal distributions.

### 3. Slowest Endpoints (Table)

- **Metric:** Avg or P99 duration per route.
- **Sort:** Descending by duration.
- **Limit:** Top 10.
