# Graph Snapshot Compression & Restoration

## Overview
Graph exports from Neo4j can now be compressed before landing in S3 and later restored on-demand. The backend introduces streaming utilities that keep memory usage bounded for very large graphs (10M+ nodes) and support both GZIP and Zstandard (ZSTD) algorithms. Compression metadata is persisted alongside the object so decompression can recover the original content type and provenance.

## Configuration
1. **S3 access** – Set the usual credentials in the server environment (`S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`). If unset, the service falls back to `AWS_REGION` and anonymous credentials.
2. **Optional knobs** – GraphQL callers can provide a compression `level` (1-9 for GZIP, 1-19 for ZSTD), custom metadata, and a `deleteSourceAfter` flag to remove the original object once the transformation succeeds.
3. **Binary dependencies** – Zstandard compression uses the bundled `node-zstandard` binaries so no additional system packages are required.

## GraphQL Mutations
Two mutations are exposed on the core schema:

```graphql
mutation CompressSnapshot($input: GraphCompressionJobInput!) {
  compressGraphSnapshot(input: $input) {
    bucket
    sourceKey
    targetKey
    algorithm
    mode
    bytesIn
    bytesOut
    compressionRatio
    durationMs
    etag
    metadata
  }
}
```

Example variables:

```json
{
  "input": {
    "bucket": "graph-exports",
    "sourceKey": "neo4j/snapshots/run-2025-09-26.json",
    "algorithm": "ZSTD",
    "level": 10,
    "metadata": {
      "tenant": "acme",
      "dataset": "production"
    },
    "deleteSourceAfter": true
  }
}
```

To reverse the process:

```graphql
mutation RestoreSnapshot($input: GraphDecompressionJobInput!) {
  decompressGraphSnapshot(input: $input) {
    bucket
    sourceKey
    targetKey
    mode
    bytesIn
    bytesOut
    compressionRatio
    metadata
  }
}
```

## Operational Notes
- **Default object keys** – Compressing appends `.gz` or `.zst`; decompressing strips those suffixes. Custom `targetKey` values override this behavior.
- **Metadata** – The service writes `graph-original-key`, `graph-original-content-type`, `graph-compression-mode`, and `graph-compression-algorithm` to S3 object metadata so downstream tooling can reason about lineage.
- **Streaming uploads** – Data flows from S3 download ➜ compression transform ➜ multipart upload without buffering the entire snapshot in memory. Failures propagate cleanly, and S3 sources can be deleted automatically when requested.
- **Large datasets** – ZSTD delivers higher ratios for large graphs while GZIP remains compatible with existing pipelines. Both modes are exercised in Jest to guard regressions.

