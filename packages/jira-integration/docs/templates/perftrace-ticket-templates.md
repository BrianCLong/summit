# PerfTrace Ticket Template Examples

Use the following templates when creating PerfTrace tickets with the Jira integration. Replace bracketed placeholders with project-specific values.

## 1. Latency Regression

- **Summary**: `[Service] latency regression detected in [environment]`
- **Description**:
  ```
  h2. Summary
  * Metric: {perfMetric}
  * Baseline: {baselineValue} ms
  * Current: {currentValue} ms
  * Regression Window: {regressionWindow}

  h2. Impact
  * Affected transactions: {transactionVolume}
  * Error budget impact: {errorBudgetImpact}

  h2. Next Steps
  # Investigate recent deployments in the regression window.
  # Correlate PerfTrace anomalies with service logs.
  # Provide remediation ETA.
  ```
- **Severity**: `critical`
- **Labels**: `perftrace, latency`

## 2. Throughput Degradation

- **Summary**: `[Service] throughput degradation detected`
- **Description**:
  ```
  h2. Summary
  * Metric: {perfMetric}
  * Baseline: {baselineValue} rps
  * Current: {currentValue} rps
  * Environment: {environment}

  h2. Observations
  * Notable incidents: {relatedIncidents}
  * Linked dashboards: {dashboardUrl}

  h2. Owner Checklist
  # Validate capacity autoscaling.
  # Confirm downstream dependencies are healthy.
  # Attach supporting graphs.
  ```
- **Severity**: `high`
- **Labels**: `perftrace, throughput`

## 3. Error Rate Spike

- **Summary**: `[Service] error rate spike requires investigation`
- **Description**:
  ```
  h2. Summary
  * Metric: {perfMetric}
  * Baseline: {baselineValue}%
  * Current: {currentValue}%
  * Environment: {environment}

  h2. Mitigation
  * Initial triage owner: {owner}
  * Rollback status: {rollbackStatus}

  h2. Notes
  # Link to recent deploy changes.
  # Document temporary mitigations.
  ```
- **Severity**: `blocker`
- **Labels**: `perftrace, reliability`

## Custom Field Guidance

| Field | Example Value |
| --- | --- |
| `environment` | `prod` |
| `regressionWindow` | `24h` |
| `owners` | `account-id-1` |
| `perfMetric` | `checkout_latency_p95` |
| `baselineValue` | `120` |
| `currentValue` | `210` |

These templates are compatible with the `createPerfTraceTicket` helper and can be supplied via `additionalFields` when extra structure is required.
