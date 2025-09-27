# Custom Graph Metrics

The Summit graph API now supports ad-hoc Cypher metrics that analysts can run directly from GraphQL. This feature makes it easy to compute bespoke insights—such as hub score, clustering coefficient, or path-length sampling—without deploying new backend code.

## GraphQL API

Two new queries are available:

- `customGraphMetrics(input: CustomGraphMetricRequest!): [CustomGraphMetricResult!]!`
- `customGraphMetricTemplates: [GraphMetricTemplate!]!`

### Executing metrics

```graphql
query TopologySnapshot($investigationId: ID!) {
  customGraphMetrics(
    input: {
      investigationId: $investigationId
      metrics: [
        {
          key: "degree"
          description: "Top degree nodes"
          cypher: """
            MATCH (n:Entity { tenantId: $tenantId })
            WHERE $investigationId IS NULL OR n.investigationId = $investigationId
            OPTIONAL MATCH (n)--(m)
            WITH n, count(m) AS degree
            RETURN n.id AS nodeId, degree
            ORDER BY degree DESC
            LIMIT coalesce($limit, 25)
          """
          parameters: { limit: 10 }
          ttlSeconds: 600
        }
      ]
    }
  ) {
    key
    cached
    executedAt
    data
  }
}
```

- `tenantId` defaults to the authenticated user when omitted.
- `ttlSeconds` is optional; values below five seconds are clamped to a five second cache entry.
- Set `useCache: false` to force re-computation when debugging.

### Templates

`customGraphMetricTemplates` returns reusable Cypher blueprints for common metrics (node degree, clustering coefficient, average shortest path). You can copy the template, adjust the Cypher, and submit it through `customGraphMetrics`.

## Redis caching

Each metric response is cached under a key composed of tenant, investigation scope, metric key, and a hash of the Cypher plus parameters. Cache hits bypass Neo4j entirely. Failures to read or write Redis are logged but do not interrupt the request.

## Safety

- Only read operations are permitted. Queries containing `CREATE`, `MERGE`, `DELETE`, `SET`, `DROP`, or write-style APOC/db calls are rejected before they reach Neo4j.
- Requests must include a tenant scope, either explicitly or via the authenticated user.
- Results are serialized so Neo4j integers and entities are safe for JSON transport.

## Testing

Unit coverage includes

- cache hit and miss behaviour against mocked Redis,
- write-query detection safeguards,
- resolver validation of authentication and tenant routing.

Run the targeted tests with:

```bash
cd server
npm test -- custom-graph-metrics
```

This exercises both the service and resolver suites.
