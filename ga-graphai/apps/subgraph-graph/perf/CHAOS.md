# Neo4j Failover Chaos Drill

This playbook validates the subgraph's retry/backoff logic when the Neo4j primary becomes
unavailable. The goal is to demonstrate controlled degradation within the error budget and
fast recovery to full service.

## Prerequisites

- Subgraph running locally (`npm run dev`) with Redis enabled.
- Neo4j causal cluster or a single instance with `systemctl` access.
- `tc` or equivalent tooling to inject packet loss.

## Scenarios

### 1. Packet Loss Injection

1. Capture a 60-second steady-state baseline with `k6 run --duration 1m k6-neighborhood.js`.
2. Introduce packet loss to the Neo4j port:

   ```bash
   sudo tc qdisc add dev eth0 root netem loss 60% 25%
   ```

3. Re-run the k6 scenario for another 60 seconds. Observe `retryCount` in
   `extensions.cost.operations[*].meta` – it should stay ≤ configured retry ceiling.
4. Remove the fault: `sudo tc qdisc del dev eth0 root netem`.
5. Confirm the latency trend returns to baseline within two polling intervals.

### 2. Primary Demotion / Restart

1. Trigger a Neo4j leader restart (`neo4j-admin server restart`).
2. Keep `k6-neighborhood.js` running with a 2m duration. The cost extension should log
   retries during the restart window, but requests must eventually succeed once the new leader
   is elected.
3. Validate that the cache hit ratio remains >0.4 during the disruption, indicating that hot
   neighborhoods continue to serve from Redis.

## Reporting

- Export k6 summaries and analyze using `../scripts/analyze-cost-extension.mjs`.
- Attach the resulting JSON + analyzer output to the incident log.
- Note any requests exceeding the SLO budgets and update the error budget tracker.
