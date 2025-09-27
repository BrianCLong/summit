# Advanced GraphQL Search API

The search-engine microservice exposes a GraphQL endpoint that unifies Elasticsearch relevance, PostgreSQL run metadata, and Neo4j relationship context. Use the `advancedSearch` query to run multi-source investigations with policy-aware filters.

## Endpoint

- **URL:** `POST /graphql`
- **Authentication:** Same headers as the REST endpoints (supports `Authorization` and tenant-scoped headers).
- **Content-Type:** `application/json`

## Query

```graphql
query AdvancedSearch($input: AdvancedSearchInput!) {
  advancedSearch(input: $input) {
    total
    took
    timedOut
    suggestions
    facets
    results {
      runId
      status
      runbook
      startedAt
      tenant
      relevanceScore
      highlights {
        field
        snippets
      }
      relatedNodes {
        id
        type
        properties
      }
      source
    }
  }
}
```

### Variables

```json
{
  "input": {
    "tenantId": "tenant-a",
    "query": "malware",
    "statuses": ["completed", "running"],
    "dateRange": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-02-01T00:00:00Z"
    },
    "nodeTypes": ["Indicator"],
    "minRelevance": 0.6,
    "limit": 25,
    "offset": 0
  }
}
```

## Response

```json
{
  "data": {
    "advancedSearch": {
      "total": 3,
      "took": 12,
      "timedOut": false,
      "suggestions": ["malware analysis"],
      "facets": {
        "status": {
          "buckets": []
        }
      },
      "results": [
        {
          "runId": "run-1",
          "status": "completed",
          "runbook": "Investigate malware",
          "startedAt": "2024-01-01T00:00:00Z",
          "tenant": "tenant-a",
          "relevanceScore": 0.92,
          "highlights": [
            {
              "field": "goal",
              "snippets": ["Investigate <mark>malware</mark> outbreak"]
            }
          ],
          "relatedNodes": [
            {
              "id": "ioc-1",
              "type": "Indicator",
              "properties": {
                "value": "1.2.3.4",
                "kind": "ip"
              }
            }
          ],
          "source": {
            "goal": "Investigate malware",
            "status": "completed"
          }
        }
      ]
    }
  }
}
```

## Filter Enforcement

The resolver submits every query to OPA using the `search/filters` policy. Policies validate tenant scoping, allowed node labels, and numeric bounds before the databases are queried. Requests with mismatched tenants, restricted node types, or invalid ranges are rejected with a descriptive error message. 【F:apps/search-engine/src/graphql/resolvers.ts†L1-L234】【F:server/policies/search_filters.rego†L1-L43】

## Data Sources

- **PostgreSQL (`runs` table):** Provides run state, timing, and goal metadata. SQL filters cover tenant, status, and date ranges. 【F:apps/search-engine/src/graphql/resolvers.ts†L137-L188】
- **Elasticsearch:** Supplies scored results, highlights, facets, and suggestions via the existing search service. 【F:apps/search-engine/src/graphql/resolvers.ts†L94-L132】
- **Neo4j:** Optionally expands each run with related nodes limited to the requested labels. 【F:apps/search-engine/src/graphql/resolvers.ts†L59-L108】

OPA decisions can be tuned by editing `server/policies/search_filters.rego`, and the GraphQL endpoint is mounted alongside the REST routes in the microservice. 【F:apps/search-engine/src/server.ts†L1-L196】
