# IntelGraph Query Issues Runbook

## Overview

This runbook guides the diagnosis and resolution of IntelGraph query performance issues, timeouts, and errors. It is intended for on-call engineers and developers debugging graph-related incidents.

## Detection

- **Alerts**: Watch for high latency (>1s p95) or error rate spikes (>1%) in the `neo4j` subsystem.
- **Logs**: Search for "Slow Neo4j query" in the application logs.
- **Metrics**:
  - `neo4j_query_latency_ms`: Histogram of query execution times.
  - `neo4j_query_errors_total`: Counter of failed queries.
  - `neo4j_connectivity_up`: Gauge indicating connection status.

## Diagnosis Steps

### 1. Check Connectivity

Ensure the application can reach the Neo4j database.

- Check `neo4j_connectivity_up` metric.
- Inspect logs for "Neo4j connectivity required but initialization failed" or "Lost Neo4j connectivity".

### 2. Identify Slow Queries

Filter logs for `msg="Slow Neo4j query"`.
The log entry will contain:

- `query`: The sanitized Cypher query.
- `durationMs`: Execution time in milliseconds.
- `tenantId`: The tenant context.

### 3. Analyze Query Patterns

- **Unbounded Expansions**: Look for queries with `*..` or missing limit clauses.
- **Lock Contention**: Frequent write errors or timeouts may indicate multiple transactions trying to modify the same nodes.
- **Missing Indexes**: If simple lookups are slow, check if the label/property combination is indexed.

### 4. Inspect Connection Pool

- Check if `Active connections` is hitting the limit (`NEO4J_MAX_POOL_SIZE`).
- High acquisition timeouts often mean the pool is exhausted.

## Common Failure Modes

### Connection Pool Exhaustion

- **Symptoms**: `ServiceUnavailable`, `SessionExpired`, or timeouts acquiring connections.
- **Action**:
  - Increase `NEO4J_MAX_POOL_SIZE` if resources allow.
  - Check for connection leaks (sessions not closed in `finally` blocks).

### Query Timeouts

- **Symptoms**: `Neo.ClientError.Transaction.TransactionTimedOut`
- **Action**:
  - Optimize the query (add indexes, reduce scope).
  - Increase `NEO4J_CONNECTION_TIMEOUT_MS` (temporary fix).

### Large Result Sets

- **Symptoms**: OOM errors or massive latency spikes.
- **Action**: Ensure pagination (`SKIP`/`LIMIT`) is used.

## Triage Checklist

- [ ] Is the database up and reachable?
- [ ] Are error rates elevated for all tenants or just one?
- [ ] Is the latency spike correlated with a specific deployment or job?
- [ ] Are there "Slow Neo4j query" logs?
- [ ] Is the connection pool saturated?

## Configuration

- `NEO4J_SLOW_QUERY_THRESHOLD_MS`: Threshold for logging slow queries (default: 2000ms).
- `NEO4J_LOG_CYPHER`: Set to `true` to log full Cypher queries (non-prod only).
