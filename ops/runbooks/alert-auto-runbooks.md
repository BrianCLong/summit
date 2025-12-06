# Automated Alert Runbooks

Generated from Prometheus alert rules with remediation and verification hooks.

Each alert includes:
- Triage summary and PromQL
- One-click remediation via `ops/observability-ci/scripts/one-click-remediation.sh`
- Verification hook to confirm recovery


## Alert: HighErrorRate
**Severity**: `page`
**Summary**: High error rate
**PromQL**:
```promql
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
```
**One-click remediation**:
```bash
./ops/observability-ci/scripts/one-click-remediation.sh "HighErrorRate"
```
**Verification hook**:
```bash
make -C ops/observability-ci smoke
```

## Alert: HighLatency
**Severity**: `page`
**Summary**: High request latency
**PromQL**:
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
```
**One-click remediation**:
```bash
./ops/observability-ci/scripts/one-click-remediation.sh "HighLatency"
```
**Verification hook**:
```bash
make -C ops/observability-ci smoke
```
