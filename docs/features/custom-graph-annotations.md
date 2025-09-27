# Custom Graph Annotations

The Summit graph now supports analyst-authored annotations on entities and relationships. Notes, tags, and confidence metadata are stored in PostgreSQL while still surfacing inside the Neo4j knowledge graph for traversal-heavy workloads.

## Capabilities

- Attach rich notes to either a node (`Entity`) or relationship (`Edge`).
- Persist analyst confidence, security enclave, and optional tags on each annotation.
- Enforce policy decisions through the existing OPA integration before read, create, update, or delete operations.
- Maintain an audit trail for every mutation.

## GraphQL Additions

The schema introduces a `tags` field and uses dedicated mutations to manage annotations:

```graphql
mutation {
  createEntityAnnotation(
    entityId: "entity-123",
    input: {
      content: "Analyst note"
      confidence: HIGH
      enclave: US_ONLY
      tags: ["priority", "watchlist"]
    }
  ) {
    id
    content
    tags
    createdAt
  }
}
```

Similar operations exist for edges (`createEdgeAnnotation`), updates (`updateAnnotation`), and deletes (`deleteAnnotation`). Querying `Entity.annotations` or `Edge.annotations` automatically filters responses with OPA to ensure analysts only see data they are cleared to access.

## Storage Model

### PostgreSQL

Annotations are canonically persisted in the `graph_annotations` table:

| Column        | Type      | Notes |
| ------------- | --------- | ----- |
| `id`          | `uuid`    | Primary key (generated server-side).
| `target_type` | `text`    | `ENTITY` or `EDGE` for routing synchronisation logic.
| `target_id`   | `text`    | Matches the entity ID or Neo4j relationship identifier.
| `content`     | `text`    | Analyst note body.
| `confidence`  | `text`    | Defaults to `UNKNOWN` when omitted.
| `tags`        | `text[]`  | Optional tags, stored as a PostgreSQL array.
| `enclave`     | `text`    | Security boundary used for OPA checks.
| `created_by`  | `text`    | User identifier for auditing.
| `updated_by`  | `text`    | Last user to modify the annotation.
| `created_at`  | `timestamptz` | Timestamp of insertion.
| `updated_at`  | `timestamptz` | Timestamp of latest update.

Two supporting indexes accelerate lookups by `(target_type, target_id)` and by `enclave` for policy evaluation. A migration is included under `server/db/migrations/postgres/2025-09-15_graph_annotations.sql` and mirrored in the bootstrap path inside `server/src/config/database.ts` so local environments auto-create the table.

### Neo4j Synchronisation

Every mutation mirrors the row into Neo4j so graph traversals and visualisations continue to work without modification:

1. Insert/update/delete in PostgreSQL.
2. On success, run the corresponding Cypher query:
   - `MATCH (e:Entity {id: $targetId}) … MERGE (e)-[:HAS_ANNOTATION]->(a)` for entities.
   - `MATCH ()-[r]->() WHERE toString(id(r)) = $targetId … MERGE (r)-[:HAS_ANNOTATION]->(a)` for edges.
3. Store metadata (content, confidence, tags, timestamps, createdBy, enclave) on the `Annotation` node.
4. Record the audit event in `audit_events`.

If synchronisation to Neo4j fails, the Postgres insert is rolled back to keep systems aligned.

## Running Locally

1. Apply migrations if you are not relying on the bootstrap helper:
   ```bash
   cd server
   npm run db:migrate
   ```
2. Start the stack (`npm run dev`) and exercise the new GraphQL mutations via your preferred client.
3. Inspect PostgreSQL (`SELECT * FROM graph_annotations;`) or Neo4j Browser to confirm the annotation mirrors.

## Testing

Unit coverage exists at `server/tests/graphql/annotations.resolvers.test.ts` with Jest-based mocks for both data stores and OPA. Run the suite with:

```bash
cd server
npm test -- annotations.resolvers
```

This validates creation, updates, deletion, and policy-aware retrieval logic without requiring live database connections.
