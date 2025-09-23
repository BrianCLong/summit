# Temporal Analytics v1

Temporal support introduces:
- Sliding time windows (`T-5m`, `T-1h`, `T-24h`).
- Temporal edges with `firstSeen` and `lastSeen` timestamps.
- k-shortest temporal paths with bounded search.
- Index helper to ensure timestamp lookups are efficient.

Use `TemporalIndexService` to create indexes and `TemporalPathService` for path queries.
