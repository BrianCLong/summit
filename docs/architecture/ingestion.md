# Ingestion Architecture

Summit ingestion follows a governed, deterministic path:

1. **Switchboard Wedge** routes sources into typed connector lanes.
2. **Debezium lineage capture** records source-to-graph provenance.
3. **Semantic chunking** normalizes text and evidence windows.
4. **Intent-compiled GraphRAG** executes bounded multi-hop retrieval.
5. **Maestro swarm execution** (Jules + Codex + Observer) produces a confidence-scored report.

## Golden Inputs

Use `datasets/wow/mit-sloan-startups-2026.jsonl` and `datasets/wow/intsum-2026-threat-horizon.jsonl` for local demo ingestion.

## Fast Path

```bash
pnpm demo:company
```

This command runs `scripts/wow.sh`, generates a demo report, and emits a copy/paste GraphQL mutation for swarm execution.

## Data Governance

- Every ingest path must produce provenance references (source URL or immutable local URI).
- Every traversal is budgeted and bounded (max hops, max nodes).
- Every output includes confidence scores and source links.
