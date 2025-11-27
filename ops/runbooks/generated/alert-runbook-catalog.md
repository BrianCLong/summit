# Generated Alert Runbooks

This catalog is generated from `ops/alerts/slo-burn-rules.yml` and pairs each
alert with a one-click remediation proposal and verification hook.

Run `python ops/observability-ci/scripts/alert_runbook_generator.py` to refresh
the catalog after updating alert definitions.

## NLQLatencySLOBurn

- **Service:** `gateway`
- **Severity:** `critical`
- **Summary:** NL→Cypher latency SLO burning fast
- **Description:** 95th percentile NL→Cypher latency is {{ $value }}s (threshold: 2.0s) over the last 5 minutes
- **Runbook URL:** https://runbooks.intelgraph.io/slo/nlq-latency

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/NLQLatencySLOBurn.json --out runbooks/generated/proposals/NLQLatencySLOBurn.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service gateway
```

## APIErrorRateSLOBurn

- **Service:** `api`
- **Severity:** `critical`
- **Summary:** API error rate SLO breach
- **Description:** API error rate is {{ $value | humanizePercentage }} (threshold: 1%) over the last 5 minutes
- **Runbook URL:** https://runbooks.intelgraph.io/slo/api-error-rate

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/APIErrorRateSLOBurn.json --out runbooks/generated/proposals/APIErrorRateSLOBurn.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service api
```

## DatabaseConnectionPoolHigh

- **Service:** `neo4j`
- **Severity:** `warning`
- **Summary:** Database connection pool usage high
- **Description:** Neo4j connection pool is {{ $value | humanizePercentage }} full (threshold: 80%)
- **Runbook URL:** https://runbooks.intelgraph.io/slo/db-connections

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/DatabaseConnectionPoolHigh.json --out runbooks/generated/proposals/DatabaseConnectionPoolHigh.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service neo4j
```

## ModelBudgetNearLimit

- **Service:** `gateway`
- **Severity:** `warning`
- **Summary:** Model budget approaching limit
- **Description:** Model budget is {{ $value | humanizePercentage }} spent for environment {{ $labels.env }}
- **Runbook URL:** https://runbooks.intelgraph.io/slo/model-budget

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/ModelBudgetNearLimit.json --out runbooks/generated/proposals/ModelBudgetNearLimit.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service gateway
```

## IngestLatencySLOBurn

- **Service:** `api`
- **Severity:** `warning`
- **Summary:** Data ingest latency SLO breach
- **Description:** 95th percentile ingest latency is {{ $value }}s (threshold: 1.5s)
- **Runbook URL:** https://runbooks.intelgraph.io/slo/ingest-latency

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/IngestLatencySLOBurn.json --out runbooks/generated/proposals/IngestLatencySLOBurn.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service api
```

## ExportLatencySLOBurn

- **Service:** `api`
- **Severity:** `warning`
- **Summary:** Data export latency SLO breach
- **Description:** 95th percentile export latency is {{ $value }}s (threshold: 1.2s)
- **Runbook URL:** https://runbooks.intelgraph.io/slo/export-latency

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/ExportLatencySLOBurn.json --out runbooks/generated/proposals/ExportLatencySLOBurn.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service api
```

## HighCPUUsage

- **Service:** `unknown`
- **Severity:** `warning`
- **Summary:** High CPU usage detected
- **Description:** CPU usage is {{ $value }}% on instance {{ $labels.instance }}
- **Runbook URL:** link pending (generated entry)

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/HighCPUUsage.json --out runbooks/generated/proposals/HighCPUUsage.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```

## HighMemoryUsage

- **Service:** `unknown`
- **Severity:** `warning`
- **Summary:** High memory usage detected
- **Description:** Memory usage is {{ $value }}% on instance {{ $labels.instance }}
- **Runbook URL:** link pending (generated entry)

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/HighMemoryUsage.json --out runbooks/generated/proposals/HighMemoryUsage.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```

## DiskSpaceLow

- **Service:** `unknown`
- **Severity:** `critical`
- **Summary:** Disk space running low
- **Description:** Disk space is {{ $value }}% free on {{ $labels.instance }}:{{ $labels.mount }}
- **Runbook URL:** link pending (generated entry)

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/DiskSpaceLow.json --out runbooks/generated/proposals/DiskSpaceLow.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```

## AuthenticationFailureSpike

- **Service:** `unknown`
- **Severity:** `critical`
- **Summary:** Authentication failure spike detected
- **Description:** Authentication failures at {{ $value }} per second over the last 5 minutes
- **Runbook URL:** https://runbooks.intelgraph.io/security/auth-failures

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/AuthenticationFailureSpike.json --out runbooks/generated/proposals/AuthenticationFailureSpike.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```

## PolicyViolationIncrease

- **Service:** `unknown`
- **Severity:** `warning`
- **Summary:** Policy violation rate increased
- **Description:** Policy violations at {{ $value }} per second for policy {{ $labels.policy }}
- **Runbook URL:** https://runbooks.intelgraph.io/security/policy-violations

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/PolicyViolationIncrease.json --out runbooks/generated/proposals/PolicyViolationIncrease.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```

## CircuitBreakerOpen

- **Service:** `unknown`
- **Severity:** `critical`
- **Summary:** Circuit breaker is open
- **Description:** Circuit breaker for {{ $labels.provider }} is open
- **Runbook URL:** https://runbooks.intelgraph.io/model/circuit-breaker

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/CircuitBreakerOpen.json --out runbooks/generated/proposals/CircuitBreakerOpen.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```

## ModelProviderHighErrorRate

- **Service:** `unknown`
- **Severity:** `critical`
- **Summary:** Model provider error rate high
- **Description:** Error rate for {{ $labels.provider }}/{{ $labels.model }} is {{ $value | humanizePercentage }}
- **Runbook URL:** https://runbooks.intelgraph.io/model/error-rate

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/ModelProviderHighErrorRate.json --out runbooks/generated/proposals/ModelProviderHighErrorRate.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```

## ModelLatencyHigh

- **Service:** `unknown`
- **Severity:** `warning`
- **Summary:** Model latency is high
- **Description:** 95th percentile latency for {{ $labels.provider }}/{{ $labels.model }} is {{ $value }}s
- **Runbook URL:** https://runbooks.intelgraph.io/model/latency

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/ModelLatencyHigh.json --out runbooks/generated/proposals/ModelLatencyHigh.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```

## BuildTimeRegression

- **Service:** `unknown`
- **Severity:** `warning`
- **Summary:** Build time regression detected
- **Description:** 95th percentile build time for {{ $labels.pipeline }} is {{ $value }}s (threshold: 600s)
- **Runbook URL:** https://runbooks.intelgraph.io/ci/build-regression

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/BuildTimeRegression.json --out runbooks/generated/proposals/BuildTimeRegression.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```

## TestCoverageDropped

- **Service:** `unknown`
- **Severity:** `warning`
- **Summary:** Test coverage dropped below threshold
- **Description:** Test coverage for {{ $labels.suite }} is {{ $value }}% (threshold: 75%)
- **Runbook URL:** https://runbooks.intelgraph.io/ci/test-coverage

**One-click remediation**:
```sh
python ops/remediator/propose.py --from runbooks/generated/alerts/TestCoverageDropped.json --out runbooks/generated/proposals/TestCoverageDropped.proposal.json
```

**Verification hook (CI-safe)**:
```sh
python ops/observability-ci/scripts/check_oncall_paths.py --service unknown
```
