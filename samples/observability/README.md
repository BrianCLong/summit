# Observability First Demo Service

This sample shows traces flowing across an API → worker → database path using the Observability First SDKs.

## Components

- `api/main.py` — FastAPI service instrumented with the Python SDK.
- `worker/worker.py` — Background worker emitting metrics/logs.
- `db/schema.sql` — Example schema with synthetic latency trigger.

Run `docker compose up` from this directory to replay synthetic load and watch SLO alerts fire.
