# Search Operations Runbook

## Overview
The search stack is built on **Typesense** with a multi-tenant gateway wrapper.

## Architecture
- **Gateway**: `apps/gateway` injects `tenant:={id}` filters.
- **Indexer**: `services/search-indexer` consumes events from Redis Streams (`search:ingest:stream`) and upserts to Typesense.
- **Reindex**: `search/reindex/runner.ts` handles zero-downtime alias swaps (`@current` -> `@vNext`).

## Key Commands

### Inspect Collections
```bash
ts-node tools/searchctl/searchctl.ts list-collections
```

### Inspect Aliases
```bash
ts-node tools/searchctl/searchctl.ts list-aliases
```

### Trigger Reindex
To reindex `docs` to version 2 (creates `docs@v2` and swaps alias):
```bash
ts-node search/reindex/runner.ts docs 2
```

## Handling Incidents

### High Indexing Lag
1. Check `search-indexer` logs for errors.
2. Check Redis Stream length: `XLEN search:ingest:stream`.
3. If DLQ is filling up (`search:ingest:dlq`), inspect bad messages.
   ```bash
   redis-cli lrange search:ingest:dlq 0 5
   ```

### Search Errors / Timeouts
1. Verify Typesense health: `curl $TYPESENSE_HOST/health`.
2. Check Gateway logs for "Typesense error".
3. If specific tenant is affected, check if they hit rate limits.

### Disaster Recovery
1. **Restore**: Apply nightly snapshot to new Typesense instance.
2. **Rebuild**: If snapshot is corrupt, trigger `RebuildAll` job (see `services/search-indexer` README) which iterates DB and pushes to queue.

## Tuning Relevance
Edit `search/schemas/*.json` to adjust `default_sorting_field` or facets.
Update `search/synonyms/general.json` and deploy.
