# AI Insights GraphQL Endpoints

This document summarizes newly added AI/analytics GraphQL queries for IntelGraph.

## Queries

- suggestLinks(entityId: ID!, limit: Int = 5): [AIRecommendation!]!
  - Returns likely missing edges for the given entity using a common-neighbors heuristic in Neo4j (no external ML dependency).
  - Result fields: `from`, `to`, `score`, `reason`.

- detectAnomalies(investigationId: ID, limit: Int = 10): [AIAnomaly!]!
  - Returns entities with anomalously high degree (z-score) within the whole graph or a given investigation.
  - Result fields: `entityId`, `anomalyScore`, `reason`.

- searchEntities(q: String!, filters: JSON, limit: Int = 25): [Entity!]!
  - Full-text search over entities using Neo4j full-text index `entity_search`, ordered by score.
  - `filters` supports basic keys such as `type` and `investigationId`.

- searchEntitiesHybrid(q: String!, filters: JSON, limit: Int = 25): [Entity!]!
  - Hybrid ranking: merges Neo4j full-text scores (BM25-like) with Postgres pgvector similarity if available.
  - Falls back to full-text-only when pgvector/functions aren’t installed.

## Example Operations

Query suggestions for an entity:

```
query Suggest($id: ID!) {
  suggestLinks(entityId: $id, limit: 5) {
    from
    to
    score
    reason
  }
}
```

Hybrid search:

```
query Hybrid($q: String!, $filters: JSON) {
  searchEntitiesHybrid(q: $q, filters: $filters, limit: 20) {
    id
    label
    type
  }
}
```

Detect anomalies in an investigation:

```
query Anoms($inv: ID!) {
  detectAnomalies(investigationId: $inv, limit: 10) {
    entityId
    anomalyScore
    reason
  }
}
```

Search entities with optional filters:

```
query Search($q: String!, $filters: JSON) {
  searchEntities(q: $q, filters: $filters, limit: 20) {
    id
    type
    label
    properties
    investigationId
  }
}
```

## Notes

- These queries are synchronous and designed for responsiveness without requiring the ML queue. For heavier GNN tasks, use the existing ML service (`ml/app`) via the server services.
- Ensure the full-text index is present; the server migration bootstraps `entity_search` if missing.
- Results depend on graph quality and available relationships; tune limits to your dataset size.
- `suggestLinks` also enqueues a background GNN job and publishes to the `aiSuggestions` subscription; cache is populated in Redis for quick repeats.
- To stream updates into the UI, the client needs a subscriptions link. Add `graphql-ws` to the client and ensure `VITE_API_URL` points to your GraphQL endpoint; the client auto-configures a WS link when available.
- To ingest completed GNN results, POST to `/webhooks/gnn/suggestions` with `{ entityId, recommendations: [{ from, to, score, reason? }] }` to update cache and publish via subscriptions.
- To enable hybrid vector search, run `node server/scripts/setup_pgvector.js` (requires Postgres superuser privileges to `CREATE EXTENSION vector`).
- To adjust embedding dimension to your chosen model, run `node server/scripts/adjust_pgvector_dimension.js --dimension <N>` and set `EMBEDDING_DIMENSION=<N>` in env.
- First-time backfill: `node server/scripts/backfill_embeddings.js --investigationId <id> --limit 50000 --batch 100 --model text-embedding-3-large --dimension 3072` (options are optional; defaults come from env).
