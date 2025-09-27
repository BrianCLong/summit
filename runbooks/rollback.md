# Rollback Strategy Runbook

## 1. Canary Guardrails
1. Deploy new release to canary slice (5% traffic) in primary region.
2. Monitor automated SLO checks for 15 minutes:
   - HTTP/GraphQL p95 latency < 200 ms.
   - Error rate < 1% overall and <0.1% for privileged mutations.
   - Kafka end-to-end latency < 2 s p95.
3. If any metric breaches thresholds for two consecutive intervals, freeze rollout and initiate automated revert.

## 2. Automated Application Revert
1. Trigger `rollback:service` pipeline (Git tag `rollback-${release}`) to redeploy the previous container images and OPA bundles.
2. Pipeline steps:
   - Scale down current deployment to zero.
   - Redeploy prior version with blue/green swap.
   - Flush Redis tenant shards tied to new release feature flags.
   - Run smoke tests and confirm observability dashboards recover.
3. Confirm rollback completion in incident channel; leave feature flags disabled pending postmortem.

## 3. Data Migration Backout
1. Identify migration batch ID from deployment notes.
2. For reversible migrations, execute paired down-migration scripts within Postgres/Neo4j transaction windows.
3. For forward-only migrations:
   - Pause ingress via Kafka topic pausing.
   - Restore database snapshot from pre-deploy checkpoint (RPO ≤5 minutes) using automated restore jobs.
   - Replay Kafka backlog to recover committed events, skipping messages tied to failed release.
4. Validate data integrity via checksum jobs and contract tests before re-opening traffic.

## 4. Communication & Audit
- Document incident timeline in runbook template, referencing impacted tenants/pods.
- File follow-up tasks to re-run canary with mitigations once root cause addressed.
- Attach rollback artifacts (logs, dashboards) to compliance evidence store for audit readiness.
