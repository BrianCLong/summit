# IntelGraph v1.0 GA - Disaster Recovery (DR) Runbook

## Severity Levels

- **SEV-1 (Critical):** Data unavailable for > 5 mins, Data Loss, Security Breach.
- **SEV-2 (High):** Performance degradation > 50%, non-critical data unavailable.
- **SEV-3 (Medium):** Minor feature breakage, internal tool issues.

## RTO/RPO Targets

- **RTO (Recovery Time Objective):** 30 minutes.
- **RPO (Recovery Point Objective):** 60 seconds.

## Scenarios & Procedures

### 1. Region Failover (Primary Region Down)

**Trigger:** > 50% error rate on primary region ingress or total availability zone failure.

**Procedure:**
1. **Verify Outage:** Check AWS/Cloud status page and internal dashboards (`summit-system-health`).
2. **Declare Incident:** Open SEV-1 ticket. Notify stakeholders via `#outage-alerts`.
3. **Stop Ingress:** Update DNS (Route53) to point to maintenance page or secondary region (read-only mode initially).
4. **Promote Database Replicas:**
   - **Postgres:** Execute `promote-standby.sh` in secondary region.
     ```bash
     ./scripts/dr/promote-postgres.sh --region us-west-2
     ```
   - **Neo4j:** Force leader election in secondary cluster or promote read-replica.
     ```bash
     ./scripts/dr/promote-neo4j.sh --region us-west-2
     ```
5. **Verify Data Integrity:** Run `checksum-verification` job.
6. **Enable Write Traffic:** Update DNS to point to secondary region.
7. **Scale Up:** Ensure secondary region has sufficient pod capacity (HPA should handle this, but verify).

### 2. Neo4j Cluster Failure

**Trigger:** Neo4j cluster unavailable or leader election loop.

**Procedure:**
1. **Check Logs:** `kubectl logs -l app=neo4j`.
2. **Restart Core Members:** Rolling restart.
   ```bash
   kubectl rollout restart statefulset/neo4j-core
   ```
3. **Restore from Backup (If corrupted):**
   - Locate latest snapshot in S3 (`s3://intelgraph-backups/neo4j/latest`).
   - Scale down Neo4j.
   - Run restore job.
   - Scale up.
   - Replay Ledger events since snapshot timestamp from `provenance_ledger` in Postgres.

### 3. Provenance Ledger Resync

**Trigger:** Neo4j and Postgres out of sync (Counts differ > 1%).

**Procedure:**
1. **Identify Delta:** Run reconciliation script.
   ```bash
   npm run task:reconcile-ledger -- --dry-run
   ```
2. **Replay Events:**
   ```bash
   npm run task:reconcile-ledger -- --fix
   ```

## Drills

**Frequency:** Quarterly.
**Next Drill:** [Date]
**Success Criteria:** RTO < 30m, No data loss > 1m.
