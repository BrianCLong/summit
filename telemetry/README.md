# Release Readiness Telemetry Pack

This directory contains the core telemetry and signals model for determining if a release is safe, tracking post-merge confidence, and identifying states of degraded dependency health.

## Overview

The canonical set of release readiness signals is defined in `release-readiness.yaml`. It is parsed by checking scripts and consumed by dashboards to track dependencies, CI/CD health, and general post-merge success.

The system evaluates three classes of signals:
1. **Dependency Health Checks**: Can we communicate with upstream requirements (GitHub APIs, NPM Registry, Auth0)?
2. **Post-Merge Confidence**: Are recent merges succeeding? Are coverage thresholds remaining high?
3. **Degradation Indicators**: Are there signals pointing to an active incident (e.g., latency spikes or consecutive CI failures)?

## File Structure

* `telemetry/release-readiness.yaml`: The canonical YAML definition file containing endpoints, metrics, thresholds, and criticality flags.
* `scripts/health-check/release-readiness-check.sh`: A shell script (using `curl` and `jq`) to execute the telemetry checks dynamically and return a JSON verdict of overall system state.
* `dashboards/runtime/release-readiness-dashboard.json`: The Grafana dashboard configuration capturing real-time metrics based on the signal definitions.

## How to add a new check

To add a new health check:
1. Open `release-readiness.yaml`
2. Add a new entry under the relevant section (`dependency_health_checks` or `post_merge_confidence_signals` or `degradation_indicators`).
3. Ensure the YAML structure matches existing signals (name, endpoint/metric, expected condition/threshold).
4. If the signal is critical to a release succeeding, mark `critical: true`.

Example dependency check:
```yaml
- name: "my_new_service_health"
  endpoint: "https://api.myservice.com/health"
  expected_response: 200
  timeout: 5
  critical: true
```

## Interpreting Verdicts

The `release-readiness-check.sh` script produces a JSON object with an overall verdict and an array of individual checks:

* **READY**: All critical dependency checks passed and no severe degradation conditions were met. The release is cleared.
* **NOT_READY**: One or more critical checks failed (e.g., GitHub API is down, NPM is unreachable). The release should be paused.
