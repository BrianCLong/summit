# Disaster Recovery Drill Procedure

**Frequency:** Weekly
**Owner:** SRE Team

## Objective

Verify that the automated failover mechanisms work as expected and RTO/RPO targets are met.

## Prerequisites

- **Notifications:** Notify `#devops` and `#engineering` channels.
- **Traffic:** Run during off-peak hours (e.g., Sunday 02:00 UTC).
- **Tooling:** Ensure `summitctl` and AWS CLI are configured.

## Execution Steps

### 1. Pre-Flight Check

Run the automated health check:

```bash
npm run dr:health-check
```

### 2. Simulate Failure

We simulate a failure by blocking traffic or manually failing a health check.

**Option A: Simulation Script (Preferred for Drill)**
Run the simulation script which uses mock interfaces to verify logic without real infrastructure impact.

```bash
npm run dr:simulate
```

**Option B: Real Infrastructure (Game Day)**
_Warning: This will impact production traffic._

1. Update Route53 Health Check configuration to point to a non-existent path.
2. Watch for Alert firing: `RegionHealthCheckFailed`.

### 3. Verify Automated Response

- **DNS:** Check that DNS propagation updates within 60 seconds.
- **Database:** (If testing DB failover) Verify Aurora failover events in RDS console.

### 4. Measure Metrics

- **RTO:** Time from "Failure Detected" to "System Available in Secondary".
- **RPO:** Check `ReplicationLag` metric in CloudWatch.

### 5. Resolution

- Restore Health Check configuration.
- Verify traffic returns to Primary region.

## Post-Drill

- **Report:** Generate a DR Report using `scripts/dr/generate_report.ts`.
- **Issues:** File tickets for any failures or delays > targets.
