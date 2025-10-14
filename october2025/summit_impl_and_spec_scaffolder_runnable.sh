#!/usr/bin/env bash
# File: tools/scaffold_summit.sh
# Purpose: Generate runnable /impl and /spec scaffolds for Summit (MVP-2 → GA)
# Usage: bash tools/scaffold_summit.sh [--force]
# Idempotent: yes (will not clobber without --force)
# Author: AURELIUS

set -euo pipefail

FORCE=false
if [[ "${1:-}" == "--force" ]]; then
  FORCE=true
fi

root_dir="$(pwd)"
msg(){ echo "[scaffold] $*"; }
mkfile(){
  local path="$1"; shift
  if [[ -f "$path" && "$FORCE" != true ]]; then
    msg "skip existing file: $path"; return 0
  fi
  mkdir -p "$(dirname "$path")"
  cat >"$path" <<'EOF'
$CONTENT_PLACEHOLDER
EOF
}

# --- Helper to write files with inline heredocs -----------------------------
write(){ # write <path> <<'EOF' ... EOF
  local path="$1"; shift
  if [[ -f "$path" && "$FORCE" != true ]]; then
    msg "skip existing file: $path"; return 0
  fi
  mkdir -p "$(dirname "$path")"
  cat >"$path" ;
  msg "wrote: $path"
}

# --- Directory layout -------------------------------------------------------
mkdir -p spec/api spec/schemas spec/policy spec/examples \
         impl/python/summit/{core,policy,provenance,eval,sdk,cli} \
         impl/python/tests/{unit,integration} \
         impl/rust \
         experiments configs .github/workflows compliance

# --- Makefile ---------------------------------------------------------------
write Makefile <<'EOF'
.PHONY: bootstrap test run bench sbom slsa lint fmt

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

bench:
	. .venv/bin/activate && python impl/python/bench.py

sbom:
	syft packages . -o spdx-json=SBOM.spdx.json || true

slsa:
	echo "(stub) generate SLSA provenance" && mkdir -p compliance && date > compliance/PROVENANCE.txt
EOF

# --- pyproject for Python impl ---------------------------------------------
write impl/python/pyproject.toml <<'EOF'
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "summit"
version = "0.1.0"
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
  "blake3>=0.4",
  "networkx>=3",
  "pyyaml>=6",
  "jsonschema>=4",
]

[project.optional-dependencies]
dev = ["pytest", "pytest-cov", "ruff", "pre-commit"]

[project.scripts]
summit = "summit.cli.main:app"
EOF

# --- README -----------------------------------------------------------------
write impl/python/README.md <<'EOF'
# Summit Python Impl (MVP-2)

Commands:
- `summit init` — create local config
- `summit run --plan spec/examples/plans/cognitive_insights.yaml` — execute plan
- `summit trace <run_id>` — show provenance DAG summary
- `summit eval <run_id> --suite ci-v1` — run eval suite
EOF

# --- CLI --------------------------------------------------------------------
write impl/python/summit/cli/main.py <<'EOF'
from __future__ import annotations
import json, uuid, sys, pathlib
import typer
from rich import print
from pydantic import BaseModel
from ..core.orchestrator import Orchestrator, Plan
from ..provenance.dag import ProvenanceStore
from ..eval.harness import EvalHarness

app = typer.Typer(help="Summit CLI")

@app.command()
def init(path: str = "~/.config/summit/config.json"):
    p = pathlib.Path(path).expanduser()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"api": {"endpoint": "http://localhost:8080"}}, indent=2))
    print(f"[green]Wrote[/green] {p}")

@app.command()
def run(plan: str):
    plan_obj = Plan.from_file(plan)
    orch = Orchestrator()
    run_id = orch.execute(plan_obj)
    print({"run_id": run_id})

@app.command()
def trace(run_id: str):
    store = ProvenanceStore.default()
    dag = store.get_run(run_id)
    print(json.dumps(dag, indent=2))

@app.command()
def eval(run_id: str, suite: str = "ci-v1"):
    harness = EvalHarness()
    res = harness.run(run_id, suite)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    app()
EOF

# --- Core orchestrator ------------------------------------------------------
write impl/python/summit/core/orchestrator.py <<'EOF'
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List
import uuid, time, yaml
from ..provenance.dag import ProvenanceStore

@dataclass
class Step:
    id: str
    type: str
    resources: Dict[str, Any] | None = None

@dataclass
class Plan:
    inputs: Dict[str, Any]
    steps: List[Step]
    constraints: Dict[str, Any] | None = None
    policies: List[str] | None = None
    fallbacks: List[str] | None = None

    @staticmethod
    def from_file(path: str) -> "Plan":
        with open(path, "r") as f:
            data = yaml.safe_load(f)
        steps = [Step(**s) for s in data.get("steps", [])]
        return Plan(
            inputs=data.get("inputs", {}),
            steps=steps,
            constraints=data.get("constraints"),
            policies=data.get("policies"),
            fallbacks=data.get("fallbacks"),
        )

class Orchestrator:
    def __init__(self):
        self.prov = ProvenanceStore.default()

    def execute(self, plan: Plan) -> str:
        run_id = str(uuid.uuid4())
        # Minimal execution loop (stub)
        start = time.time()
        self.prov.begin_run(run_id, plan)
        for step in plan.steps:
            # TODO: route by policy, enforce budgets, cache, retries
            self.prov.record_step(run_id, step.id, {
                "type": step.type,
                "resources": step.resources or {},
                "latency_ms": 5,
                "cost": {"tokens": 10}
            })
        self.prov.end_run(run_id, {"latency_ms": int((time.time()-start)*1000)})
        return run_id
EOF

# --- Provenance -------------------------------------------------------------
write impl/python/summit/provenance/dag.py <<'EOF'
from __future__ import annotations
from typing import Any, Dict
import json, os, pathlib, hashlib

class ProvenanceStore:
    def __init__(self, root: str):
        self.root = pathlib.Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def default() -> "ProvenanceStore":
        return ProvenanceStore(".summit/provenance")

    def _path(self, run_id: str) -> pathlib.Path:
        return self.root / f"{run_id}.jsonl"

    def begin_run(self, run_id: str, plan: Any):
        rec = {"event": "begin", "run_id": run_id, "plan": json.loads(json.dumps(plan, default=lambda o: o.__dict__))}
        self._append(run_id, rec)

    def record_step(self, run_id: str, step_id: str, data: Dict[str, Any]):
        self._append(run_id, {"event": "step", "run_id": run_id, "step_id": step_id, **data})

    def end_run(self, run_id: str, summary: Dict[str, Any]):
        self._append(run_id, {"event": "end", "run_id": run_id, **summary})

    def get_run(self, run_id: str):
        p = self._path(run_id)
        return [json.loads(line) for line in p.read_text().splitlines()] if p.exists() else []

    def _append(self, run_id: str, obj: Dict[str, Any]):
        p = self._path(run_id)
        with p.open("a") as f:
            f.write(json.dumps(obj) + "\n")
EOF

# --- Eval Harness -----------------------------------------------------------
write impl/python/summit/eval/harness.py <<'EOF'
from __future__ import annotations
from typing import Dict, Any

class EvalHarness:
    def run(self, run_id: str, suite: str) -> Dict[str, Any]:
        # Stub: returns constant metrics; replace with real evals over GOLDEN
        return {"run_id": run_id, "suite": suite, "metrics": {"precision@5": 0.0, "latency_ms": 0}}
EOF

# --- Policy (OPA client stub) ----------------------------------------------
write impl/python/summit/policy/opa_client.py <<'EOF'
from __future__ import annotations
from typing import Dict, Any

class OPAClient:
    def evaluate(self, input_doc: Dict[str, Any]) -> Dict[str, Any]:
        # Stub: always allow
        return {"allow": True, "mutations": [], "route": "default"}
EOF

# --- SDK (Python) -----------------------------------------------------------
write impl/python/summit/sdk/client.py <<'EOF'
from __future__ import annotations
import json, pathlib
from typing import Any

class Client:
    def __init__(self, api_key: str | None = None, endpoint: str | None = None):
        self.api_key = api_key
        self.endpoint = endpoint or "http://localhost:8080"

    def run(self, plan: dict) -> dict:
        # Local stub for offline dev
        return {"status": "submitted", "run_id": "local-stub"}
EOF

# --- Tests ------------------------------------------------------------------
write impl/python/tests/unit/test_cli.py <<'EOF'
from typer.testing import CliRunner
from summit.cli.main import app

def test_init(tmp_path):
    runner = CliRunner()
    cfg = tmp_path/"config.json"
    res = runner.invoke(app, ["init", str(cfg)])
    assert res.exit_code == 0
    assert cfg.exists()
EOF

# --- GitHub Actions CI ------------------------------------------------------
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

# --- Pre-commit -------------------------------------------------------------
write .pre-commit-config.yaml <<'EOF'
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
      - id: ruff-format
EOF

# --- OpenAPI (stub) ---------------------------------------------------------
write spec/api/openapi.yaml <<'EOF'
openapi: 3.0.3
info:
  title: Summit API
  version: 0.1.0
paths:
  /v1/plans/run:
    post:
      summary: Execute plan
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Plan'
      responses:
        '200': {description: OK}
  /v1/runs/{run_id}:
    get:
      summary: Get run status
      parameters:
        - in: path
          name: run_id
          required: true
          schema: {type: string}
      responses:
        '200': {description: OK}
components:
  schemas:
    Plan:
      type: object
      properties:
        inputs: {type: object}
        steps:
          type: array
          items:
            type: object
            properties:
              id: {type: string}
              type: {type: string}
              resources: {type: object}
        constraints: {type: object}
        policies: {type: array, items: {type: string}}
        fallbacks: {type: array, items: {type: string}}
EOF

# --- JSON Schemas -----------------------------------------------------------
write spec/schemas/plan.schema.json <<'EOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit/spec/plan.schema.json",
  "title": "Plan",
  "type": "object",
  "required": ["steps"],
  "properties": {
    "inputs": {"type": "object"},
    "steps": {"type": "array", "items": {"$ref": "#/definitions/Step"}},
    "constraints": {"type": "object"},
    "policies": {"type": "array", "items": {"type": "string"}},
    "fallbacks": {"type": "array", "items": {"type": "string"}}
  },
  "definitions": {
    "Step": {
      "type": "object",
      "required": ["id", "type"],
      "properties": {
        "id": {"type": "string"},
        "type": {"type": "string", "enum": ["model", "tool", "route"]},
        "resources": {"type": "object"}
      }
    }
  }
}
EOF

# --- Policy (Rego) ----------------------------------------------------------
write spec/policy/cost_budget.rego <<'EOF'
package cost.budget

default allow := true

budget := input.plan.constraints.budget_tokens
usage := sum([s.cost.tokens | s := input.plan.steps[_]])

violation { usage > budget }
allow { not violation }
EOF

# --- Example Plans ----------------------------------------------------------
write spec/examples/plans/cognitive_insights.yaml <<'EOF'
inputs:
  query: "Top risks in Q3"
steps:
  - id: retrieve
    type: tool
    resources: {tool_id: "retriever:v1"}
  - id: rank
    type: model
    resources: {model_id: "reranker:v1"}
  - id: synthesize
    type: model
    resources: {model_id: "llm:gpt4o"}
constraints:
  latency_ms: 2000
  budget_tokens: 8000
policies:
  - policy://cost/default
  - policy://privacy/pii
fallbacks:
  - route://cached
EOF

# --- Bench stub -------------------------------------------------------------
write impl/python/bench.py <<'EOF'
print("(stub) run microbenchmarks")
EOF

# --- Compliance placeholders -----------------------------------------------
write compliance/README.md <<'EOF'
- SBOM: generated via `make sbom`
- SLSA: stub in `make slsa`
- Policies in `spec/policy/*`
EOF

msg "Scaffold complete. Next steps:"
cat <<'NOTE'
1) make bootstrap
2) make test
3) make run
4) summit trace <RUN_ID>
NOTE
