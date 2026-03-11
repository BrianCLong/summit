# Summit Alert Runbook

This document details the descriptions, severity levels, and response procedures for the key operational alerts within the Summit system.

## 1. API 5xx Error Rate High

- **Description:** The percentage of requests to the API Gateway resulting in server-side 5xx errors has exceeded the defined threshold.
- **Severity Levels:**
  - **Warning:** > 0.5% for 5 minutes.
  - **Critical (Page):** > 1.0% for 5 minutes.
- **Response Procedure:**
  1. Check the Grafana dashboards for API Gateway logs and metrics to identify the specific endpoints returning 5xx errors.
  2. Inspect the distributed traces in Jaeger to determine if the failure originates in the Gateway, downstream microservices, Auth0, or the database.
  3. Review recent deployments via the release markers on the dashboards. Rollback if a recent deployment correlates with the spike in errors.
  4. Escalate to `@intelgraph-api` or `@team-gateway` if the issue persists and requires deeper debugging.

## 2. Request Latency (p95) High

- **Description:** The 95th percentile response time for API requests has significantly deviated from the 7-day baseline.
- **Severity Levels:**
  - **Warning:** +30% vs 7d baseline for 10 minutes.
  - **Critical (Page):** +60% vs 7d baseline for 10 minutes.
- **Response Procedure:**
  1. Check Jaeger traces for bottlenecks in request flows. Determine if the latency is compute-bound, database-bound (e.g., slow Neo4j or Postgres queries), or network-bound.
  2. Review saturation metrics (CPU/Memory) in Grafana for the API Gateway and relevant backend services. Scale pods if necessary.
  3. Verify if there are ongoing long-running processes or background jobs consuming excessive resources.
  4. Escalate to `@intelgraph-api` and `@team-ops`.

## 3. Graph Build Time Degradation

- **Description:** The duration for multi-hop Cypher traversals and context assembly in Neo4j is exceeding acceptable limits.
- **Severity Levels:**
  - **Warning:** > 2 seconds for 5 minutes.
  - **Critical (Page):** > 5 seconds for 5 minutes.
- **Response Procedure:**
  1. Open the Neo4j Grafana Dashboard (`docs/monitoring/neo4j-grafana-dashboard.json`).
  2. Review Neo4j query latency, JVM garbage collection (GC) pauses, and memory usage.
  3. Identify unoptimized Cypher queries or missing indices. Check the Neo4j query log if enabled.
  4. Escalate to `@intelgraph-data` if schema adjustments or query optimizations are required.

## 4. Ingestion Throughput / Queue Lag

- **Description:** Data processing through the Python worker architecture is falling behind, resulting in a buildup in the Redis `feed:ingest` queue.
- **Severity Levels:**
  - **Warning:** > 10,000 items in queue for 15 minutes.
  - **Critical (Page):** > 50,000 items in queue for 15 minutes.
- **Response Procedure:**
  1. Check the status of the Python ingestion workers. Look for crashed pods or restarts in Kubernetes/Grafana.
  2. Review worker logs for exceptions related to data parsing, external API rate limits, or database insertion failures.
  3. If resources are constrained, scale the number of ingestion worker instances to increase throughput.
  4. Escalate to `@team-ingest`.

## 5. Model Inference Latency High

- **Description:** LLM queries and tool-use operations within the agent ecosystem are experiencing elevated response times.
- **Severity Levels:**
  - **Warning:** +40% vs 7d baseline for 10 minutes.
  - **Critical (Page):** +80% vs 7d baseline for 10 minutes.
- **Response Procedure:**
  1. Verify the status of the external LLM provider (e.g., OpenAI, Anthropic) via their status pages.
  2. Check the logs for the agent adapters (`adapters/`) for rate-limiting (429) or timeout errors from the provider.
  3. Inspect Jaeger traces to confirm the latency originates at the model invocation step and not internally within the orchestration layer.
  4. Escalate to `@intelgraph-core` if the issue requires fallback mechanisms or provider adjustments.
