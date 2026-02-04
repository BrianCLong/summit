# OSINT Slice Demo Runbook

## Purpose

Ingest OSINT data, run LLM analysis, and hit the IntelGraph demo endpoint for a demo-ready flow.

## Prerequisites

- Python 3.11 with `pip`.
- `pnpm` installed.
- Docker running with Redis available on `localhost:6379`.
- IntelGraph API running locally (`http://localhost:4000`).

## Start Core Services

```bash
pnpm install
make bootstrap
make up
```

**Expected output**

- IntelGraph API responds on `http://localhost:4000/health` with `200`.
- Redis is reachable on `localhost:6379`.

## Start the OSINT API + Worker

```bash
cd python
pip install -e .[dev]
uvicorn intelgraph_py.main:app --reload --port 8010
```

In a second terminal:

```bash
cd python
celery -A intelgraph_py.celery_app worker -l info
```

**Expected output**

- Uvicorn logs show `Uvicorn running on http://127.0.0.1:8010`.
- Celery worker logs show it is connected to Redis and ready to receive tasks.

## Ingest OSINT Data

```bash
curl -X POST http://localhost:8010/osint/enrich \
  -H 'Content-Type: application/json' \
  -d '{"ip": "8.8.8.8", "actor_name": "Demo Actor"}'
```

**Expected output**

- JSON response with a `task_id`.
- Celery logs show the enrichment task starting/completing.

## Run LLM Analysis

```bash
curl -X POST http://localhost:8010/analyze/sentiment \
  -H 'Content-Type: application/json' \
  -d '{"node_id": "ip-8.8.8.8", "node_label": "ip", "text": "Suspicious traffic observed from public resolvers."}'
```

**Expected output**

- JSON response with a `task_id`.
- Celery logs show the sentiment analysis task.

## Hit the Demo Endpoint

```bash
curl -s http://localhost:4000/api/demo/status
```

**Expected output**

- `{ "status": "ready", "mode": "demo" | "production", "db": "connected" }`.

## Common Failure Modes

- **Redis not running**: Celery fails to connect; start Redis or re-run `make up`.
- **Uvicorn port conflict**: Change `--port 8010` to another free port and update the curl URLs.
- **Celery tasks stuck**: Verify the worker process is running and `CELERY_BROKER_URL` points to Redis.
- **Demo endpoint 404**: IntelGraph API is not running; check `make up` logs.
