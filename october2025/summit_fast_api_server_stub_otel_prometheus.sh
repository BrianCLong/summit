#!/usr/bin/env bash
# File: tools/add_server.sh
# Purpose: Add a minimal FastAPI server with /v1/plans/run and /v1/runs/{run_id}
#          and wire OpenTelemetry (OTLP) + Prometheus (/metrics).
# Usage: bash tools/add_server.sh [--force]
set -euo pipefail
FORCE=${1:-}
write(){
  local path="$1"; shift
  if [[ -f "$path" && "$FORCE" != "--force" ]]; then echo "[skip] $path exists"; return; fi
  mkdir -p "$(dirname "$path")"
  cat >"$path"; echo "[wrote] $path"
}

# --- pyproject deps ---------------------------------------------------------
write impl/python/pyproject.toml <<'EOF'
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "summit"
version = "0.1.1"
description = "Summit runtime: policy-aware, provenance-first orchestration"
authors = [{name = "Summit"}]
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
  "typer>=0.12",
  "rich>=13",
  "pydantic>=2",
  "httpx>=0.27",
  "orjson>=3",
  "opentelemetry-api>=1.26",
  "opentelemetry-sdk>=1.26",
  "opentelemetry-exporter-otlp>=1.26",
  "opentelemetry-instrumentation-fastapi>=0.46b0",
  "opentelemetry-instrumentation-asgi>=0.46b0",
  "blake3>=0.4",
  "networkx>=3",
  "pyyaml>=6",
  "jsonschema>=4",
  "fastapi>=0.115",
  "uvicorn[standard]>=0.30",
  "prometheus-client>=0.20"
]

[project.optional-dependencies]
dev = ["pytest", "pytest-cov", "ruff", "pre-commit", "httpx", "anyio"]

[project.scripts]
summit = "summit.cli.main:app"
summit-api = "summit.server:serve"
EOF

# --- Server package __init__ ------------------------------------------------
write impl/python/summit/server/__init__.py <<'EOF'
from .main import create_app, serve  # noqa: F401
EOF

# --- Server main ------------------------------------------------------------
write impl/python/summit/server/main.py <<'EOF'
from __future__ import annotations
import os
from typing import Any, Dict
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware
from time import perf_counter
from ..core.orchestrator import Orchestrator, Plan
from ..provenance.dag import ProvenanceStore

# ---- Metrics ---------------------------------------------------------------
REQ_COUNTER = Counter("summit_http_requests_total", "HTTP requests", ["method", "path", "code"])
LATENCY = Histogram("summit_http_request_latency_seconds", "Request latency (s)", ["method", "path", "code"])
RUNS_STARTED = Counter("summit_runs_started_total", "Runs started")
RUNS_COMPLETED = Counter("summit_runs_completed_total", "Runs completed")

class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = perf_counter()
        response = await call_next(request)
        code = str(response.status_code)
        path = request.url.path
        method = request.method
        REQ_COUNTER.labels(method, path, code).inc()
        LATENCY.labels(method, path, code).observe(perf_counter() - start)
        return response

# ---- Tracing (OTel) --------------------------------------------------------
from opentelemetry import trace
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor


def _init_tracing():
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    service = os.getenv("OTEL_SERVICE_NAME", "summit-api")
    provider = TracerProvider(resource=Resource.create({SERVICE_NAME: service}))
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

# ---- FastAPI app -----------------------------------------------------------

def create_app() -> FastAPI:
    _init_tracing()
    app = FastAPI(title="Summit API", version="0.1.0")
    app.add_middleware(MetricsMiddleware)
    FastAPIInstrumentor.instrument_app(app)

    orch = Orchestrator()
    store = ProvenanceStore.default()

    @app.post("/v1/plans/run")
    def run_plan(payload: Dict[str, Any]):
        try:
            if "steps" not in payload:
                raise ValueError("missing steps")
            plan = Plan(
                inputs=payload.get("inputs", {}),
                steps=[
                    # minimal normalization
                    type("S", (), {"id": s.get("id", "step"), "type": s.get("type", "tool"), "resources": s.get("resources", {})})
                    for s in payload.get("steps", [])
                ],
                constraints=payload.get("constraints"),
                policies=payload.get("policies"),
                fallbacks=payload.get("fallbacks"),
            )
            RUNS_STARTED.inc()
            run_id = orch.execute(plan)  # emits provenance internally
            return JSONResponse({"run_id": run_id})
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=str(e))

    @app.get("/v1/runs/{run_id}")
    def get_run(run_id: str):
        data = store.get_run(run_id)
        if not data:
            raise HTTPException(status_code=404, detail="run not found")
        # crude completion signal
        if any(ev.get("event") == "end" for ev in data):
            RUNS_COMPLETED.inc()
        return JSONResponse({"run_id": run_id, "events": data})

    @app.get("/metrics")
    def metrics():
        return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.get("/healthz")
    def healthz():
        return {"ok": True}

    return app

# Entrypoint

def serve(host: str = "0.0.0.0", port: int = 8080):
    import uvicorn
    uvicorn.run(create_app(), host=host, port=port, log_level="info")
EOF

# --- __main__ bootstrap -----------------------------------------------------
write impl/python/summit/server/__main__.py <<'EOF'
from .main import serve

if __name__ == "__main__":
    serve()
EOF

# --- Makefile target --------------------------------------------------------
write Makefile <<'EOF'
.PHONY: bootstrap test run bench sbom slsa lint fmt api

bootstrap:
	python3 -m venv .venv && . .venv/bin/activate && pip install -U pip uv
	. .venv/bin/activate && uv pip install -e "./impl/python[dev]"
	pre-commit install

lint:
	. .venv/bin/activate && ruff check impl/python && ruff format --check impl/python

fmt:
	. .venv/bin/activate && ruff format impl/python

test:
	. .venv/bin/activate && pytest -q

run:
	. .venv/bin/activate && summit run --plan spec/examples/plans/cognitive_insights.yaml

api:
	. .venv/bin/activate && OTEL_SERVICE_NAME=summit-api OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 summit-api

bench:
	. .venv/bin/activate && python impl/python/bench.py

sbom:
	syft packages . -o spdx-json=SBOM.spdx.json || true

slsa:
	echo "(stub) generate SLSA provenance" && mkdir -p compliance && date > compliance/PROVENANCE.txt
EOF

# --- Minimal API tests ------------------------------------------------------
write impl/python/tests/integration/test_api.py <<'EOF'
from fastapi.testclient import TestClient
from summit.server.main import create_app

app = create_app()
client = TestClient(app)

def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200 and r.json()["ok"] is True

def test_run_and_fetch():
    plan = {"inputs": {"q": "hi"}, "steps": [{"id": "s1", "type": "tool", "resources": {}}]}
    r = client.post("/v1/plans/run", json=plan)
    assert r.status_code == 200
    run_id = r.json()["run_id"]
    r2 = client.get(f"/v1/runs/{run_id}")
    assert r2.status_code == 200
    body = r2.json()
    assert body["run_id"] == run_id
    assert any(ev["event"] == "begin" for ev in body["events"])  # provenance exists
EOF

# --- CI: add server test step ----------------------------------------------
write .github/workflows/ci.yml <<'EOF'
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.11'}
      - name: Install system deps
        run: sudo apt-get update && sudo apt-get install -y build-essential
      - name: Bootstrap
        run: make bootstrap
      - name: Lint
        run: make lint
      - name: Test
        run: make test
EOF

echo "Done. Next:"
echo "  1) make bootstrap"
echo "  2) make test"
echo "  3) make api   # exposes /healthz and /metrics on :8080"
echo "(optional) Point an OTLP collector at OTEL_EXPORTER_OTLP_ENDPOINT (default http://localhost:4317)"
