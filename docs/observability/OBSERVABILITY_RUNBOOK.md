# Observability & Dashboards Runbook

## Core Dashboards
- **Orchestration Health:** Tracks Maestro agent swarm states (in-progress, blocked, ready).
- **GraphRAG Performance:** Latency and memory usage for Neo4j and vector search.
- **Queue Metrics:** BullMQ throughput, active/delayed/failed jobs.

## Alert Definitions
- **High Error Rate:** `rate(errors) > 5%` over 5 minutes.
- **Database Connection Drop:** Postgres/Neo4j active connections == 0.
- **Task Starvation:** Maestro swarm task queue age > 10 minutes.

## Handoff Procedures
- Ensure shift logs contain outstanding alerts.
- Detail any ongoing investigations in the observability channel.
