# Universal Architecture Drift Monitoring

## Scheduled Job
A daily protected eval run is triggered to measure and capture `drift_report.json` and `trend_metrics.json`. A weekly trend comparison runs to monitor significant regressions.

## Monitored Metrics
- **Architecture score drift**: Measures the adherence level across all active workflows.
- **Approval rate drift**: Identifies unusual spikes in manual approvals or denials.
- **Schema failure drift**: Detects if operations are starting to fail schema validation more frequently.
- **Protected eval failure drift**: Watches the regression test suite.

## Data Retention
- Eval reports: 30 days
- Trend metrics: 90 days
- Policy violations: 90 days with redaction
