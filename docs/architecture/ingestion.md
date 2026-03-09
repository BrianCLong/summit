# Ingestion Architecture

Summit uses the **Switchboard** engine for rapid data ingestion and normalization. It acts as the wedge to pull data from various sources (CSV, S3, REST APIs) and map it into our core semantic taxonomy.

## Endpoints

### Batch Ingest

To ingest a batch of records (e.g., from our demo datasets):

```bash
curl -X POST http://localhost:4000/api/ingest/batch \
  -H "Content-Type: multipart/form-data" \
  -F "file=@datasets/demo/demo-companies.jsonl"
```

*Note: Normalization logic processes these rows to detect entities like `Company` or `Person` and translates them into Neo4j nodes.*
