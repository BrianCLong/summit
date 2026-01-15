# Runbook: Graph Write Degradation

## Scope

Address elevated latency or failure rates for graph database writes.

## Signals

- p99 latency alerts for graph write paths.
- Elevated `quorum_write_latency_seconds` or Neo4j write errors.
- Increased queue depth on graph-related queues.

## Immediate Actions

1. Check Neo4j health and storage saturation.
2. Inspect write quorum router logs for timeout spikes.
3. Temporarily reduce write-heavy workloads.

## Diagnosis

- Validate network latency between services and graph DB.
- Review recent schema changes or index rebuilds.
- Check for long-running transactions or deadlocks.

## Mitigation

- Scale Neo4j write nodes or adjust heap/bolt settings.
- Pause bulk ingestion pipelines to clear backlog.
- Rebalance write quorum if a node is degraded.

## Verification

- Graph write latency returns to baseline.
- Queue depth trend reverses.
- Synthetic write probes succeed within SLO.

## Escalation

- Engage database SRE if degradation persists beyond 30 minutes.
- Document and justify any Governed Exceptions.

## References

- Write quorum metrics: `server/src/db/WriteQuorumRouter.ts`
- Monitoring metrics: `server/src/monitoring/metrics.ts`
