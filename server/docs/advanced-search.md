# Advanced Search & Discovery

This document describes the advanced search and discovery system that powers Summit. The design layers full-text, fuzzy, semantic, and graph-aware signals while exposing developer-friendly APIs and a query DSL.

## Capabilities

- **Full-text search**: token matching across `title` and `body` fields with boost for exact hits.
- **Faceted filtering**: arbitrary facet buckets (e.g., `status`, `region`, `tag`) are honored and surfaced in aggregated counts.
- **Fuzzy matching**: Levenshtein distance is used to rescue near-miss queries and typo-heavy inputs.
- **Semantic search**: optional embedding similarity (cosine) reorders results toward intent, even when literal terms are absent.
- **Saved searches & history**: user-level storage for recurring queries with timestamps.
- **Query DSL**: supports `AND`, `OR`, `NOT`, and field-qualified clauses (`tag:critical`, `entity:zeus`).
- **Autocomplete & suggestions**: prefix-based completion across document titles/tags and saved search names; suggestions blend recent top queries with fuzzed terms found in results.
- **Entity linking & cross-references**: matches query tokens to known entities on documents and emits directional references (`references` vs `referencedBy`).
- **Search analytics**: tracks popular queries and total volume to inform suggestion quality and alerting.

DSL clauses accept `AND`, `OR`, and `NOT` and can be mixed with time windows to narrow results without disabling fuzzy or semantic scoring.

## Engine Usage

```ts
import { createAdvancedSearchEngine } from '@/search/advanced-search-engine';

const engine = createAdvancedSearchEngine();
engine.index(documents);

const response = engine.search({
  text: 'zero trust guidance',
  facets: { status: ['open'] },
  semantic: true,
  fuzzy: true,
  dsl: 'tag:critical AND region:us',
  userId: 'analyst-123',
});
```

Returned responses include scored hits, facet counts, matched entities, cross-references, autocomplete suggestions, and lightweight analytics snapshots (popular queries, total volume).

## Saved Searches & History

```ts
engine.saveSearch({
  id: 'sv-1',
  name: 'Critical open zero-trust items',
  query: { text: 'zero trust', facets: { status: ['open'], tag: ['critical'] } },
  createdBy: 'alice',
});

const history = engine.searchHistory('alice');
```

## Testing

Run the focused Jest suite inside `server`:

```bash
cd server
npm test -- advanced-search-engine.test.ts
```

The tests validate full-text + facet filtering, fuzzy/semantic ranking, saved search persistence, history capture, autocomplete, entity linking, and cross-reference detection.
