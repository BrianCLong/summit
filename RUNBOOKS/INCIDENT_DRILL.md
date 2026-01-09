# Incident Drill Runbook

**Purpose:** Simulate a P1 incident impacting a critical Summit capability (e.g., IntelGraph query, OSINT pipeline) to verify detection, response, and rollback mechanics.

**Target Audience:** SREs, On-Call Engineers, Release Captains.

## 1. Preconditions
*   **Environment:** Staging (preferred) or Pre-Production. DO NOT run in Production without explicit War Room approval.
*   **Tools:**
    *   `scripts/incidents/run_incident_drill.mjs` (Drill Harness)
    *   `make rollback` (Rollback Mechanism)
    *   Observability Dashboards (Grafana/SystemHUD)
*   **State:** System must be healthy (green status) before starting.

## 2. Drill Scenarios

### Scenario A: API Latency Spike (Simulated)
*   **Fault:** Inject 2000ms latency into `IntelGraph` query resolution.
*   **Expected Detection:**
    *   SLO Alert: `HighLatency` (>1500ms).
    *   Dashboard: `p95 Latency` spike.
*   **Recovery:** Rollback to previous version or disable feature flag.

### Scenario B: OSINT Pipeline Stall
*   **Fault:** Pause `ingestion-service` processing.
*   **Expected Detection:**
    *   Queue Alert: `JobQueueSize` > Threshold.
    *   Freshness Alert: `DataFreshness` > SLA.
*   **Recovery:** Restart service or revert configuration.

## 3. Execution Steps

### Step 1: Initiate Drill
Run the harness to induce the fault (or simulate it).

```bash
# Example: Dry Run (Safe)
node scripts/incidents/run_incident_drill.mjs --scenario latency --mode dry-run

# Example: Live Drill (Staging)
node scripts/incidents/run_incident_drill.mjs --scenario latency --env staging
```

### Step 2: Verify Detection
1.  Monitor **#alerts-staging** or the **System HUD**.
2.  Confirm alert fires within **5 minutes** (TTD - Time To Detect).
3.  Note the timestamp.

### Step 3: Execute Response (Rollback)
Execute the rollback procedure if the system does not self-heal.

```bash
# Rollback via Make
make rollback v=v4.1.0 env=staging
```

### Step 4: Verify Recovery
1.  Monitor dashboards for recovery.
2.  Confirm alert resolves.
3.  Note the timestamp (TTR - Time To Recover).

### Step 5: Post-Drill Analysis
The harness generates an artifact at `artifacts/incidents/drills/`. Review it and commit it to the repo if this was a certification drill.

```bash
cat artifacts/incidents/drills/DRILL_*.md
```

## 4. Troubleshooting
*   **Drill failed to induce fault:** Check permissions and network access to the fault injection endpoint.
*   **Alert didn't fire:** Check Prometheus/Alertmanager configuration and threshold values.
*   **Rollback failed:** Check Helm/Deployment permissions and image availability.
