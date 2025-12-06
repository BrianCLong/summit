# IntelGraph Observability

This guide explains how to monitor IntelGraph performance and health in development and production.

## Key Metrics

We track the following golden signals for IntelGraph:

1.  **Latency**: Time taken to execute GraphQL resolvers and Neo4j queries.
2.  **Traffic**: Request rate (RPS) for queries and mutations.
3.  **Errors**: Rate of failed queries (e.g., timeouts, syntax errors).
4.  **Saturation**: Neo4j connection pool utilization.

### Prometheus Metrics

| Metric Name | Type | Description |
| :--- | :--- | :--- |
| `neo4j_query_latency_seconds` | Histogram | Latency of Cypher queries |
| `neo4j_query_errors_total` | Counter | Total number of failed queries |
| `neo4j_connectivity_up` | Gauge | 1 if connected, 0 if disconnected |
| `graphql_resolver_duration_seconds` | Histogram | Duration of GraphQL resolvers |

## Logging

We use structured logging (Pino) to capture context around operations.

### Example Log Entry

```json
{
  "level": "info",
  "time": 1678886400000,
  "msg": "Graph query executed",
  "traceId": "1234567890abcdef",
  "query": "MATCH (n) RETURN n LIMIT 1",
  "duration_ms": 45,
  "result_count": 1
}
```

## Distributed Tracing

OpenTelemetry is used to trace requests from the GraphQL layer down to the database.

-   **Span**: `resolve-entity-by-id` - The GraphQL resolver execution.
-   **Span**: `neo4j-query` - The actual database query.

## Troubleshooting

### High Latency

1.  Check `neo4j_query_latency_seconds` histogram.
2.  Identify slow queries in logs (filter by `duration_ms > 1000`).
3.  Use `EXPLAIN` on the Cypher query to check execution plan.
4.  Verify indexes exist for the queried properties.

### Connection Failures

1.  Check `neo4j_connectivity_up`.
2.  Verify Neo4j container status (`docker ps`).
3.  Check network connectivity between Server and Neo4j.

## Development Tools

-   **Neo4j Browser**: Access at `http://localhost:7474` (User: `neo4j`, Pass: `devpassword`).
-   **GraphQL Playground**: Access at `http://localhost:4000/graphql`.
