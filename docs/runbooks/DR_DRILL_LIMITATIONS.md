# DR Drill Legitimacy & Limitations

**Date:** 2025-12-03
**Context:** Verification of automated DR Drills implemented in `scripts/dr/`.

## 1. What the Current Drill PROVES

The current automated drill (`scripts/dr/dr_drill.ts` execution of `scripts/dr/simulate_failover.ts`) proves the **Logical Correctness** of the Application Layer recovery strategy:

- **CRDT Logic:** Validates that `GCounter` and state structures merge correctly after a period of divergence (simulated split-brain).
- **Sync Service Integration:** Verifies that the `CrossRegionSyncService` correctly processes messages when the transport layer delivers them.
- **Failover State Transitions:** Proves the application code _can_ handle a transition from "Primary" to "Secondary" logic (if any specific logic exists).
- **Idempotency:** Proves repeated syncs do not corrupt state.

## 2. What the Current Drill DOES NOT Prove

The current drill is a **Simulation** running in a CI environment (Node.js process). It **does not interact with real AWS infrastructure**.

- **Network Path:** Does not prove Route53 DNS propagation or CloudFront failover latency.
- **Database Failover:** Does not trigger a real Aurora Global Database failover. It assumes the database is available or mocked.
- **Transport Latency:** Does not simulate real-world SNS/SQS latency or packet loss. It uses a mock/local broker or fast-path execution.
- **Permissions:** Does not verify IAM roles allow the failover actions (e.g., `rds:FailoverGlobalCluster`).

## 3. Unobservable Signals (in Simulation)

In a real outage, the following signals would be critical but are **invisible** in the current simulation:

1.  **Replication Lag Spikes:** Real Aurora replication lag (`AuroraGlobalDBReplicationLag`) creates a "Data Loss Window". The simulation assumes instant or reliable catch-up.
2.  **DNS TTL Issues:** Clients caching old IPs despite Route53 updates.
3.  **Cold Start Latency:** EKS pods in the secondary region scaling up to handle full traffic load.
4.  **Thundering Herd:** Redis cache stampedes when the secondary region takes over with a cold cache.

## 4. Required Production Artifacts for Real Drills

To upgrade this from a "Logic Check" to a "Resilience Verification", the following **Production Artifacts** are required:

- **Fault Injection Controller:** A tool (e.g., AWS FIS) to actually sever the link or kill the primary DB.
- **Canary Synthetic Monitors:** CloudWatch Synthetics verifying the _actual_ endpoint (`api.summit...`) returns 200 OK from the secondary region.
- **Observability Dashboard:** The Grafana dashboard created in this Epic must be live and showing real data, not mocked metrics.

## Conclusion

The current DR Drill is a **Green Light for Code Logic** but a **Yellow Light for Operational Readiness**. It certifies the software is robust, but the platform hosting it remains unverified under fire.
