# Demo Datasets

Drop-in files for instant local ingestion and first-run investigations.

## Included files

- `demo-companies.jsonl` — small OSINT-flavored entities (companies + executives)
- `demo-news-articles.jsonl` — short article snippets with source metadata
- `demo-relationships.csv` — explicit relationship edges for graph bootstrap

## Quick ingest example

```bash
curl -X POST http://localhost:4000/api/ingest/batch \
  -H "Content-Type: multipart/form-data" \
  -F "file=@datasets/demo/demo-companies.jsonl"
```

If your local stack exposes a different ingestion endpoint, update the URL and keep the same file payload.

## One-command flow

```bash
./scripts/wow-demo.sh
```

The script ingests all files under `datasets/demo/`, optionally triggers a demo agent run, and opens the local UI.
