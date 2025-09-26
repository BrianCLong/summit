# Graph CSV Import Mutation

The Summit GraphQL API now provides an `importGraphCsv` mutation for bulk loading
nodes and relationships into Neo4j from CSV payloads. The mutation accepts the
CSV content directly as strings, parses the data with PapaParse, validates it
against the supported schema, and performs batched Cypher `MERGE` operations for
efficient ingestion.

## Mutation

```graphql
mutation ImportGraphCsv($input: GraphCsvImportInput!) {
  importGraphCsv(input: $input) {
    success
    nodes {
      processed
      imported
    }
    relationships {
      processed
      imported
    }
    errors {
      code
      message
      row
    }
  }
}
```

### Input Fields

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `nodesCsv` | `String` | No* | CSV payload describing nodes. Required when `relationshipsCsv` is not supplied. |
| `relationshipsCsv` | `String` | No* | CSV payload describing relationships. Required when `nodesCsv` is not supplied. |
| `delimiter` | `String` | No | Optional column delimiter. Defaults to `,`. |
| `batchSize` | `Int` | No | Overrides the default batch size (max 2000) for the underlying Cypher UNWIND operations. |
| `dryRun` | `Boolean` | No | When `true`, validates the payload and reports row counts without executing Cypher writes. |

### Node CSV Schema

- Required columns: `id`, `label`
- Additional columns are treated as properties and will be merged onto the
  target node.
- Label values must contain only alphanumeric characters or underscores and
  cannot start with a number.

### Relationship CSV Schema

- Required columns: `startId`, `endId`, `type`
- Optional columns: `startLabel`, `endLabel` to scope the matched nodes.
- Additional columns map to relationship properties.
- Relationship types follow the same character constraints as labels.

### Size and Safety Guards

- CSV payloads larger than 5 MiB or containing more than 10,000 rows are
  rejected with a `CSV_TOO_LARGE` or `CSV_TOO_MANY_ROWS` error.
- Invalid schemas, missing required identifiers, or malformed values return a
  structured `GraphCsvImportError` without executing any writes.

### Example Variables

```json
{
  "input": {
    "nodesCsv": "id,label,name\n1,Person,Alice\n2,Person,Bob",
    "relationshipsCsv": "startId,endId,type\n1,2,KNOWS",
    "dryRun": false
  }
}
```

### Response

- `success`: `true` when all CSV batches are imported without validation
  failures.
- `nodes` / `relationships`: Processed and imported row counts. In dry-run mode,
  these values reflect how many rows would be ingested.
- `errors`: Detailed validation errors, including the failing code and (when
  available) the 1-indexed CSV row number.

