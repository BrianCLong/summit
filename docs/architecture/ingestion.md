# Ingestion Architecture

Summit ingestion flows through the Switchboard wedge for normalization, deduplication, and policy-aware routing before downstream graph and retrieval stages.

## Pipeline outline

1. **Input capture**: multipart file upload or connector payload
2. **Switchboard normalization**: schema alignment + metadata hydration
3. **Validation**: deterministic shape checks and provenance field gating
4. **Routing**: persisted events into graph + retrieval subsystems

## Quick local ingest example

```bash
curl -X POST http://localhost:4000/api/ingest/batch \
  -H "Content-Type: multipart/form-data" \
  -F "file=@datasets/demo/demo-companies.jsonl"
```

To run the full local first-run flow (ingest + demo investigation), use:

```bash
./scripts/wow-demo.sh
```

## Demo bundle

Use `datasets/demo/` for deterministic first-run payloads:

- `demo-companies.jsonl`
- `demo-news-articles.jsonl`
- `demo-relationships.csv`
