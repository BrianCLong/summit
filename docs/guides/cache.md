# Cache Layer (Redis + S3/MinIO)

- Hot index: Redis (`REDIS_URL` primary; fallbacks: `REDIS_HOST`/`REDIS_PORT`/`REDIS_DB`/`REDIS_PASSWORD`/`REDIS_TLS`/`REDIS_CLIENT_NAME`).
- Artifact blobs: S3/MinIO via `CACHE_BUCKET` (fallback `S3_BUCKET`) and optional `S3_ENDPOINT` (path-style forced).
- TTLs: `CACHE_INDEX_TTL_SEC` (default 86400), `CACHE_NEG_TTL_SEC` (default 300).
- Enable/disable: `CACHE_ENABLED` (default true).

Metrics

- `cache_hits_total`, `cache_misses_total`, `cache_sets_total` (labels: `store`, `op`, `tenant`).

UI

- Conductor Studio shows a “from cache (heuristic)” chip on fast, zero-cost executions.
