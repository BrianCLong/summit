# Saturation Dashboard Spec

**Goal:** Visualizes how "full" the service is relative to its capacity.

## Panels

### 1. CPU Usage (Line Chart)

- **Metric:** Container/Pod CPU usage vs Limit.
- **Y-Axis:** Percentage of Limit.
- **Thresholds:**
  - Warning: > 70%.
  - Critical: > 90%.

### 2. Memory Usage (Line Chart)

- **Metric:** Working Set vs Limit.
- **Y-Axis:** Percentage / Bytes.
- **Thresholds:**
  - Warning: > 80%.
  - Critical: > 95% (OOM risk).

### 3. Connection Pool Utilization (Line/Gauge)

- **Metric:** Active DB connections / Max Pool Size.
- **Dimensions:** `database`, `pool_name`.
- **Goal:** Detect pool exhaustion.

### 4. Event Loop Lag (Node.js specific)

- **Metric:** Average lag duration.
- **Goal:** Detect blocking operations.
