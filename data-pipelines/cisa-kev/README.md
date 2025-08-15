# CISA KEV Ingestion

Fetches the [CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities) catalog and
emits graph-compatible JSON for direct Neo4j import.

## Usage

```bash
python ingest-cisa-kev.py > kev.json
```

The output contains `nodes` and `edges` arrays with basic `source` metadata for traceability.
