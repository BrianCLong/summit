# Control Room Dashboard

The Control Room is the landing page for the Ops Console. It answers the question: "Is the system healthy?"

## Features

### System Health Score
A single metric (0-100) derived from workstream status, active alerts, and recent failure rates.
- **Green (>90)**: Nominal operation.
- **Orange (70-90)**: Degraded performance or warning alerts.
- **Red (<70)**: Active incident or critical failure.

### Live Telemetry
- **Run Volume**: Area chart showing execution volume over the last 6 hours.
- **Active Runs**: Counter of currently executing pipelines.
- **Tasks/Min**: Throughput metric.

### Autonomic Activity
Displays the status of the "Autonomic Nervous System" (ANS).
- **Active Loops**: Number of self-healing loops currently engaged.
- **Recent Decisions**: Log of automated actions taken by the ANS (e.g., "Scaled up agents", "Blocked risky prompt").

### Workstream Status
Cards for individual subsystems:
- **MC-Core**: Main orchestration engine.
- **MergeTrain**: CI/CD pipeline health.
- **IntelGraph-Ingest**: Data ingestion status.
- **UI/UX**: Frontend availability.
