# Demo Datasets

Drop-in files to test ingestion and agents.

Quick ingest example (once Switchboard endpoint exists):
```bash
curl -X POST http://localhost:4000/api/ingest/batch \
  -H "Content-Type: multipart/form-data" \
  -F "file=@datasets/demo/demo-companies.jsonl"
```

Or use future `pnpm ingest:demo` command.
