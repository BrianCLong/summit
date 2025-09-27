# Runbook: High Ingest to Graph Latency

**Alert:** `HighIngestToGraphLatency`

**Severity:** Critical

**SLO:** p95 ingest->graph latency ≤ 1.5s

---

### Summary

This alert fires when the 95th percentile latency between an event being ingested and it becoming available in the graph database exceeds 1.5 seconds for a sustained period.

### 1. Initial Triage

1.  **Acknowledge the alert.**
2.  **Check the `IntelGraph / GA SLOs` Grafana dashboard.** Look at the "P95 Ingest to Graph Latency" panel to confirm the spike and observe its duration and magnitude.
3.  **Check the status of related services:**
    *   Kafka Brokers (`kafka`)
    *   Ingestion Service (`ingestion`)
    *   Stream Processor (`stream_processor`)
    *   Graph Service (`graph-service`)
    *   Neo4j Database (`neo4j`)

### 2. Diagnostics

*   **Check Kafka consumer lag:** Are the `stream_processor` or `graph-service` consumers falling behind? Use Kafka monitoring tools to check consumer group lag.
*   **Inspect logs for errors:** Check the logs for the services listed above. Look for exceptions, connection timeouts, or processing errors.
*   **Check for resource contention:** Are any of the services experiencing high CPU or Memory usage? Check the container resource utilization dashboards.
*   **Check Neo4j performance:** Are there slow queries running? Check the Neo4j query log and performance dashboards.

### 3. Remediation

*   **Restart the lagging component:** If a specific service (e.g., `stream_processor`) is identified as the bottleneck and appears unhealthy, a restart may resolve the issue.
*   **Scale up consumers:** If consumer lag is the issue, consider scaling up the number of consumer pods for the relevant service.
*   **Investigate slow queries:** If Neo4j queries are slow, work with the development team to optimize them.
*   **Escalate:** If the cause is not immediately apparent, escalate to the on-call SRE lead or the relevant service owner.
