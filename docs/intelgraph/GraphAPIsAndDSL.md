# Graph API & DSL

## REST API

*   `POST /api/intelgraph/ingest`: Submit a `FusionPayload`.
*   `POST /api/intelgraph/query`: Execute a DSL query.
*   `POST /api/intelgraph/ckp/:planId`: Run a named Knowledge Plan.
*   `GET /api/intelgraph/analytics/centrality`: Get top nodes by centrality.

## DSL (Domain Specific Language)

A JSON-based syntax for querying the graph without raw Cypher.

Example:
```json
{
  "start": { "type": "Actor" },
  "traverse": [
    { "edgeTypes": ["MEMBER_OF"], "direction": "out", "depth": 1 }
  ]
}
```

This translates to: `MATCH (n:GraphNode WHERE entityType='Actor')-[:MEMBER_OF*1..1]->(m) RETURN m`.
