# Graph Snapshotting

The Summit backend now supports capturing and restoring full Neo4j graph states through GraphQL mutations. Snapshots are optimized with gzip compression and can be stored either inside PostgreSQL or in an S3-compatible bucket.

## GraphQL API

```graphql
mutation CreateGraphSnapshot($input: CreateGraphSnapshotInput!) {
  createGraphSnapshot(input: $input) {
    id
    label
    storage
    checksum
    nodeCount
    relationshipCount
    createdAt
  }
}

mutation RestoreGraphSnapshot($input: RestoreGraphSnapshotInput!) {
  restoreGraphSnapshot(input: $input) {
    snapshot { id storage lastRestoredAt }
    restoredNodeCount
    restoredRelationshipCount
    message
  }
}
```

### Input Parameters

| Mutation | Field | Description |
| --- | --- | --- |
| `createGraphSnapshot` | `label`, `description` | Optional metadata stored with the snapshot. |
|  | `tenantId` | Restricts export to nodes and relationships for a specific tenant (`tenant_id` property). Defaults to the caller's tenant, if provided in context. |
|  | `storage` | `POSTGRES` (default) or `S3`. |
| `restoreGraphSnapshot` | `snapshotId` | ID returned from `createGraphSnapshot`. |
|  | `tenantId` | Limits the restore scope to a tenant. When omitted, the snapshot's recorded tenant is used. |
|  | `clearExisting` | When `true` (default) clears the targeted portion of the graph before ingesting snapshot content. |

Both mutations require an authenticated user with the `ADMIN` or `OPERATOR` role.

## Storage Backends

- **PostgreSQL (default):** Snapshot bytes are inserted into a `graph_snapshots` table alongside metadata (size, checksum, counts, timestamps).
- **S3:** When `storage` is `S3`, the compressed payload is uploaded to the configured bucket and PostgreSQL only retains metadata plus the object location (`s3://bucket/prefix/<snapshot>.json.gz`).

### Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `GRAPH_SNAPSHOT_STORAGE` | Global default storage backend (`postgres` or `s3`). | `postgres` |
| `GRAPH_SNAPSHOT_NODE_BATCH_SIZE` / `GRAPH_SNAPSHOT_REL_BATCH_SIZE` | Batch size for streaming nodes and relationships out of Neo4j. | `1000` |
| `GRAPH_SNAPSHOT_S3_BUCKET` | Target bucket when using S3 storage (falls back to `S3_BUCKET`). | – |
| `GRAPH_SNAPSHOT_S3_PREFIX` | Prefix/path for stored objects. | `graph-snapshots` |
| `S3_REGION`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Optional overrides for the S3 client. | Standard AWS SDK defaults |
| _Dependency_ | Install `@aws-sdk/client-s3` in the server workspace to enable the S3 storage path. | – |

## Operational Notes

- Snapshots capture:
  - Node labels and properties (Neo4j integers are converted to JS numbers when safe).
  - Relationship types, endpoints, and properties.
- Restores run in batches to keep memory predictable and to avoid excessive transaction sizes.
- A checksum is validated before any restore is applied. A mismatch aborts the operation.
- The service records `last_restored_at` to help operators audit recovery events.

## Testing

Unit tests (`server/src/graph/__tests__/graphSnapshotService.test.ts`) cover both snapshot creation and restore flows with mocked Neo4j/PostgreSQL dependencies.

