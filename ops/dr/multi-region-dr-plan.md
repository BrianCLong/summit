# Multi-Region Disaster Recovery Plan

This plan designs and operationalizes automated failover, cross-region replication, and business continuity for mission-critical services. It defines RTO/RPO targets, outlines restoration testing automation, and optimizes the service mesh for resilient traffic management.

## Architecture Overview
- **Regions**: Primary (Region A) and secondary (Region B) with warm standby workloads and pre-provisioned capacity for critical services.
- **Control plane**: GitOps (Argo CD) with region-scoped applications and shared policies stored in a single repository.
- **Data plane**: Multi-AZ clusters per region, service mesh sidecars enabled everywhere, and regional ingress gateways with DNS-based traffic steering (weighted + health-checked).
- **Failover controller**: Health-signal fan-in (synthetics + SLO burn alerts + control plane health) feeding a failover automation workflow (see below).

## RTO/RPO Targets
| Service / Tier                  | RTO  | RPO  | Notes |
|---------------------------------|------|------|-------|
| Customer API / Gateway          | 15m  | 5m   | Stateful session storage replicated cross-region; DNS cutover via health-checked records. |
| Worker & Streaming Pipeline     | 20m  | 5m   | Uses partitioned queues with cross-region mirroring and lag monitors. |
| Core Datastores (Postgres, Neo4j)| 30m | 5m   | Logical replication to Region B; backups retained for 30 days with PITR. |
| Analytics / Batch               | 60m  | 15m  | Can run degraded in Region B with delayed data windows. |
| Control Plane (GitOps, CI agents)| 30m | 15m  | Secondary controllers pre-provisioned and on cold standby; rehydrate using stored state snapshots. |

## Cross-Region Replication
- **Postgres**: Use `postgres-cross-region.yaml` for logical replication slots; enable `wal_keep_size` sized for 60m network disruption. Monitor replication lag (`pg_stat_replication`) and alert at 2x RPO.
- **Neo4j**: Apply `neo4j-cross-region.yaml` clustered configuration with read replicas in Region B. Promote read replica on failover using orchestrated `dbms.mode=SINGLE` flip.
- **Object storage**: Enable bucket-level replication with delete protection; maintain immutable backups for 30 days.
- **Queues/Streams**: Use mirrored topics/queues (e.g., Kafka/MQ) with per-partition replication and consumer offset checkpoints synced to shared object storage every 2 minutes.

## Automated Failover Flow
1. **Detect**: Combine mesh health (Envoy CDS/LDS), ingress health checks, and synthetic probes. Require two distinct signal classes before declaring disaster.
2. **Quorum decision**: Use control-plane workflow (e.g., Argo Workflow) to require SRE + on-call approval unless severity=critical and RTO breach imminent.
3. **Execute**:
   - Flip DNS/traffic weight to Region B and enable Priority/Failover policy at the edge.
   - Promote replicated databases (Postgres `promotion` slot + `recovery.conf` update; Neo4j role flip).
   - Scale Region B replicas to production size using predefined HPA min replicas.
   - Drain Region A mesh ingress to avoid split-brain; enforce read-only mode for stateful apps until promotion completes.
4. **Validate**: Run smoke tests, cross-region consistency checks, and ensure SLO burn halts.
5. **Communicate**: Auto-publish incident updates to #ops-dr and Statuspage with timeline and RTO/RPO status.

## Restoration & Testing Automation
- **Scheduled drills**: Nightly restoration test pipeline that provisions a throwaway namespace, restores the latest backup, and runs regression smoke tests. Mark build as failed if RTO/RPO simulations exceed targets.
- **Synthetic failover**: Monthly region-failover game days that automate DNS weight flips, database promotion in sandboxes, and post-check rollback. Capture metrics for time-to-detect and time-to-recover.
- **Backup verification**: Reuse `backup-job.yaml` outputs; validate checksums and perform point-in-time restore drills weekly. Archive reports to `s3://dr-reports/<date>`.
- **Infra-as-code parity**: Drift detection between Region A/B clusters using GitOps diff; auto-apply remediation for config drift flagged by policy checks.
- **Runbook-as-code**: Store automation workflows (YAML) in `ops/dr/runbooks/` (see example tasks below) to keep procedures versioned and auditable.

### Example: Restoration Test Workflow (pseudo-YAML)
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: nightly-restore-test
spec:
  entrypoint: restore
  templates:
    - name: restore
      steps:
        - - name: restore-db
            template: postgres-restore
        - - name: run-smoke
            template: smoke-test
    - name: postgres-restore
      container:
        image: dr/restore:stable
        args: ["./restore.sh", "--target-namespace", "dr-verify"]
    - name: smoke-test
      container:
        image: dr/smoke:stable
        args: ["npm", "test", "--", "--grep", "critical-path"]
```

## Service Mesh Optimization for DR
- **Failover-aware routing**: Use locality-aware load balancing with outlier detection; enable `prefer-local` but allow rapid spillover to Region B when endpoints are unhealthy.
- **Connection draining**: Shorten drain timeouts at ingress during failover to reduce half-open connections.
- **Retry budgets**: Configure Envoy retry budgets (e.g., 20% of RPS) with jittered backoff to avoid thundering herd after promotion.
- **mTLS and identity**: Share mesh CA roots across regions; automate cert rotation and ensure SDS caches survive region isolation for >30 minutes.
- **Observability**: Emit per-region SLOs, request success histograms, and failover decision logs to centralized telemetry for postmortems.

## Business Continuity Procedures
- **Escalation**: Ops on-call leads; appoint a communications lead; declare disaster in less than 5 minutes after quorum decision.
- **Access controls**: Break-glass roles pre-provisioned in Region B with time-bound access; rotate credentials immediately after promotion.
- **Data governance**: Enforce legal-hold/retention parity across regions; log all restore actions with operator identity.
- **Post-incident**: Run blameless review within 48 hours; capture RTO/RPO performance, false positives, and mesh routing efficacy; feed remediation tasks into backlog.

## Operational Checklist
- [ ] Replication lag <5m and monitored.
- [ ] Region B capacity reserved and HPA min replicas defined for critical services.
- [ ] DNS/edge failover policies tested monthly.
- [ ] Nightly restoration workflow green for last 7 runs.
- [ ] Service mesh failover policies validated in staging before production rollout.
