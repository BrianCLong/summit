# Disaster Recovery Runbook

**Severity:** CRITICAL
**Trigger:** Loss of service in a primary region (`us-east-1`).

## 1. Assessment
- **Verify Outage:** Check CloudWatch Dashboards and Route53 Health Checks.
- **Confirm Scope:** Is it a single service or region-wide?
- **Decision:** If outage is expected to last > 10 minutes, initiate FAILOVER.

## 2. Failover Procedure (Automated)
*The system is designed to failover automatically via Route53. However, manual steps may be required for the Database.*

### A. Database Failover (Aurora Global)
1. **Check Replication Status:**
   ```bash
   aws rds describe-global-clusters --global-cluster-identifier summit-global-db
   ```
2. **Promote Secondary Region:**
   ```bash
   aws rds failover-global-cluster \
     --global-cluster-identifier summit-global-db \
     --target-db-cluster-identifier summit-secondary
   ```
3. **Verify Promotion:** Wait for status to change from `failing-over` to `available`.

### B. Redis Failover
1. **Promote Secondary Replication Group:**
   ```bash
   aws elasticache modify-replication-group \
     --replication-group-id summit-redis-secondary \
     --automatic-failover-enabled \
     --multi-az-enabled \
     --apply-immediately
   ```

### C. Traffic Redirection
1. **Verify DNS:** Ensure Route53 is not returning `us-east-1` IPs.
   ```bash
   dig api.summit.intelgraph.io +short
   ```

## 3. Post-Failover Verification
- **Run Smoke Tests:** Execute `scripts/smoke-test.cjs` against the new primary region.
- **Check Latency:** Monitor `us-west-2` latency metrics.

## 4. Failback (Recovery)
*Once `us-east-1` is stable:*
1. **Sync Data:** Ensure the original primary is caught up as a replica.
2. **Scheduled Maintenance:** Announce a maintenance window.
3. **Failover Back:** Repeat the promotion process targeting `summit-primary`.
