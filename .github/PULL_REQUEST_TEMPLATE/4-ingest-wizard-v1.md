# Ingest Wizard + Schema-Aware ETL Assistant (v1)

## Scope

- App: apps/web/ingest-wizard (React + MUI + jQuery DOM flows)
- Workers: ingestion/workers/\*
- Connectors: CSV/Parquet, RSS, STIX/TAXII, S3, MISP

## Acceptance Criteria

- AI field mapping with lineage per field
- PII classifier + license tagging
- Five connectors pass conformance suite

## Test Plan

- `npm test -w ingestion`
- Fixture datasets under /fixtures/ingest
