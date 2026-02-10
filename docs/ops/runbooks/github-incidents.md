# GitHub Incident Response Runbook

## Overview

This runbook describes how to handle GitHub platform disruptions affecting Summit's CI/CD pipelines, webhooks, and other integrations. It relies on the `scripts/monitoring/github_status_drift.py` script to detect issues.

## Detection

The `scripts/monitoring/github_status_drift.py` script runs on a schedule (and on PR merges) to query the GitHub Status API. It generates an artifact `artifacts/github_status.snapshot.json` containing the current status of GitHub components.

### Alerts
- **CI Failure**: If the monitoring script fails to fetch status, CI jobs may fail or warn.
- **Status Indicator**: The script logs warnings if the GitHub Status indicator is not "none" (e.g., "minor", "major", "critical").

## Mitigation Strategies

### 1. CI Resilience (Actions & Queuing)
- **Problem**: Hosted runners take too long to start or jobs hang.
- **Mitigation**:
    - **Timeouts**: All CI jobs have `timeout-minutes` configured to prevent infinite hanging.
    - **Self-Hosted Runners**: For critical release gates, consider switching to self-hosted runners if available.
    - **Soft-Fail**: If `artifacts/ci_health.json` indicates high queue times, non-critical checks (e.g., nightly perf) can be skipped or marked as soft-fail.

### 2. Webhook Reliability
- **Problem**: Webhook delivery fails or is delayed due to GitHub latency.
- **Mitigation**:
    - **Fast-Ack**: The `WebhookAdapter` implements a "fast-ack" pattern. It accepts requests immediately (HTTP 202) and queues them for asynchronous processing.
    - **Queue Monitoring**: Monitor the `queueSize` in the webhook adapter health check.
    - **Polling Fallback**: If webhooks are completely down, trigger critical workflows manually or enable a polling sync job (if implemented).

### 3. Policy Propagation
- **Problem**: Policy changes (e.g., Copilot access) take time to propagate during incidents.
- **Action**: Wait for the incident to resolve before assuming policy changes are active. Check `artifacts/github_status.snapshot.json` for "Copilot" or "API" status.

## Recovery

1. **Monitor Resolution**: Watch https://www.githubstatus.com/ or the generated artifacts.
2. **Re-run Jobs**: Once "All Systems Operational", re-run failed CI jobs.
3. **Verify Webhooks**: Check for gaps in data ingestion. The webhook adapter checkpoints processed records, so it should resume where it left off if the sender retries.

## Reference
- [GitHub Status API](https://www.githubstatus.com/api)
- `scripts/monitoring/github_status_drift.py`
