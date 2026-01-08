# 0014 - Unified Search Store & Ranking Rationale

## Status

Accepted

## Context

Summit needs a unified search that spans graph entities, timeline events, and documents with strict tenant isolation and sub-500ms latency. Existing Postgres-only search cannot support graph traversal weighting or tenant-scoped full-text filters.

## Decision

- Use **OpenSearch** as the primary inverted index with tenant-partitioned indices and BM25 scoring.
- Keep **Neo4j** as system of record for graph features; materialize derived fields into OpenSearch documents for ranking.
- Maintain **PostgreSQL** manifests for authoritative metadata and reindex checkpoints.
- Ranking stack: BM25 + recency decay + confidence/source boosts + diversity penalty.
- Stable pagination via HMAC-signed cursors carrying score/time/id for deterministic ordering.

## Alternatives Considered

1. **Postgres FTS only**
   - Pros: simpler, fewer systems
   - Cons: weaker relevance, limited scaling, harder per-tenant isolation; rejected.
2. **Vector-only search (pgvector)**
   - Pros: strong semantic recall
   - Cons: poor keyword precision, harder filter performance; rejected for precision and governance needs.
3. **Neo4j full-text index as sole store**
   - Pros: reduced systems
   - Cons: less mature relevance tuning, higher latency under load; rejected.

## Consequences

- - Better relevance and filter performance; + aligns with existing infra.
- - Requires sync jobs between stores; - operational overhead managing per-tenant indices.

## Validation

- Benchmark target p95 <500ms on 20k docs using sample dataset (`test-data/search-index-sample.json`).
- CI perf check `perf:samples` validates latency and cursor determinism.

## References

- `docs/wave13/mission-25-32.md`
- `test-data/search-index-sample.json`
