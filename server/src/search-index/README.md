# Search Index Service (search-index)

The `search-index` module provides a hybrid search subsystem (BM25 initially) for Entities, Claims, and Evidence, scoped by `caseId`.

## Features
- **Case-scoped Search:** Filters results by `caseId`.
- **Hybrid Search:** Uses BM25 (MiniSearch) for text relevance.
- **Filters:** Support for `type`, `time range`, `tags`, and `source`.
- **Hooks:** Automatically ingests data via `onEntityUpsert` and `onClaimUpsert` hooks in `GraphStore` and `Resolvers`.

## Schema

Indexed fields:
- `content`: Full text content (name, value, statement, description, etc.)
- `tags`: Array of strings
- `source`: Origin source
- `type`: Entity/Claim/Evidence
- `caseId`: The scoping identifier
- `createdAt`: ISO Date string

Stored fields (returned in results):
- `id`
- `type`
- `caseId`
- `tags`
- `source`
- `createdAt`
- `content` (for snippet generation)

## Configuration

- `SEARCH_ENABLED`: Set to `true` to enable ingestion.
- Storage: Index is persisted to `storage/search_index.json`.

## API

### POST /search/query
```json
{
  "caseId": "case-123",
  "q": "search term",
  "filters": {
    "type": ["Entity"],
    "timeRange": { "start": "2023-01-01", "end": "2023-12-31" }
  },
  "limit": 20,
  "cursor": 0
}
```

### POST /search/reindex
(Admin only)
```json
{
  "caseId": "case-123" // optional
}
```

## Adding New Fields
To index new fields:
1. Update `SearchIndexService.ts`: `ingest` method to map new fields to `SearchableItem`.
2. Update `SearchableItem` interface in `types.ts`.
3. If specific weighting is needed, update `MiniSearch` configuration in `SearchIndexService` constructor.

## Ranking Notes
- `type` matches are boosted (2x).
- `tags` matches are boosted (1.5x).
- Fuzzy search is enabled with threshold 0.2.
- Prefix search is enabled.
