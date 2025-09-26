# Graph Version Control

The graph service now exposes a version control flow for Neo4j investigations. Analysts can create tagged snapshots of the current graph and revert to prior states by issuing a single GraphQL mutation. Metadata for each version is indexed in PostgreSQL while full graph snapshots are stored in S3 for durability.

## Key Concepts

- **Tagged snapshots** – `manageGraphVersion` with action `TAG` captures the tenant-scoped graph (optionally limited to an investigation) and persists it as an immutable version.
- **Version metadata** – Postgres table `graph_versions` records tags, hashes, counts, and diff summaries so analysts can audit change history without fetching S3 objects.
- **S3-backed payloads** – Full node and relationship sets are serialized as JSON and uploaded to an S3 bucket defined by `GRAPH_VERSION_BUCKET` (falls back to `S3_BUCKET`).
- **Efficient diffing** – Snapshots are compared using hashed node/relationship signatures so the service only applies incremental changes when reverting large graphs.

## GraphQL Mutation

```graphql
mutation ManageGraphVersion($input: GraphVersionControlInput!) {
  manageGraphVersion(input: $input) {
    ok
    action
    version {
      id
      tag
      scope
      nodeCount
      relationshipCount
      createdAt
      lastAppliedAt
    }
    diff {
      nodesAdded
      nodesUpdated
      nodesRemoved
      relationshipsAdded
      relationshipsUpdated
      relationshipsRemoved
    }
  }
}
```

### Example Inputs

Create a snapshot tagged `baseline` for the current tenant graph:

```json
{
  "input": {
    "action": "TAG",
    "tag": "baseline",
    "description": "Initial investigation load",
    "metadata": { "source": "seed-load" }
  }
}
```

Revert the graph of an investigation back to the `baseline` snapshot:

```json
{
  "input": {
    "action": "REVERT",
    "tag": "baseline",
    "investigationId": "case-4921"
  }
}
```

## Storage & Operations

1. **Snapshot capture** – Entities and relationships for the tenant (and optional investigation) are exported from Neo4j. Each snapshot stores normalized IDs, labels, and property maps to keep replays deterministic.
2. **Hashing and diffing** – A SHA-256 hash of the snapshot is recorded along with a diff summary against the previous version to provide quick change metrics.
3. **Persistence** – Metadata is inserted into `graph_versions` with unique `(tenant_id, scope, tag)` constraints. Full snapshot JSON is uploaded to S3 under `graph-versions/<tenant>/<scope>/`.
4. **Revert** – When action `REVERT` is requested the service fetches the stored snapshot, diffs it against the live graph, and applies targeted creates, updates, and deletions inside a Neo4j transaction. Diff metrics are returned to the caller and `last_applied_at` is updated in Postgres.

## Operational Notes

- Ensure the service has permission to write to the configured S3 bucket and that the bucket is versioned or backed up according to compliance requirements.
- The diff routine favors set-based comparisons so memory usage scales linearly with node/relationship count, making it safe for large investigations.
- Tags are unique per tenant and scope; attempting to reuse a tag returns a `GRAPH_VERSION_CONFLICT` error.
- Revert requests require either a `versionId` or `tag`. When both are omitted the API responds with `BAD_USER_INPUT`.

## Testing

Jest coverage includes:

- `computeGraphDiff` summary accuracy.
- Snapshot creation flow exercising upload + metadata persistence with mocks.
- Revert flow verifying that diff operations are passed through to Neo4j apply routines.
