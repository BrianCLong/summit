# Universal Ingestion Pipeline

This module provides a reference Python ETL pipeline that ingests heterogeneous
HUMINT, SIGINT, GEOINT and OSINT data into the IntelGraph Neo4j model with
idempotent upserts and a simple dead‑letter queue (DLQ).

## Features

- Handles CSV, JSON, XML, plain text and GeoJSON inputs
- Normalises records into `Entity` and `RELATIONSHIP` structures
- Performs fuzzy entity resolution and optional NLP driven alias linking
- Loads results into Neo4j using the official Python driver

## Usage

```bash
# standard ingest
python ingest.py OSINT sample.csv sample.json \
  --neo4j-uri bolt://localhost:7687 --neo4j-user neo4j --neo4j-password password

# replay previously failed records with 1s delay between each
python ingest.py --replay-dlq uploads/dlq --rate-limit 1
```

Each record receives a deterministic `ingest_id` based on the source data and
is merged into Neo4j with `MERGE`. Failures are retried with exponential
backoff and ultimately written as JSON lines to `uploads/dlq/dlq.jsonl`. At the
end of every run a summary is printed including processed count, upserts,
dedup hits, DLQ count and latency.
