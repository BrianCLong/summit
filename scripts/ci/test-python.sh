#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
VENV_DIR=${VENV_DIR:-"$ROOT_DIR/.venv"}

export PYTHONPATH="$ROOT_DIR/backend:$ROOT_DIR/airflow:${PYTHONPATH:-}"
export COVERAGE_FILE="$ROOT_DIR/.coverage"

USE_STUBS=$(
  "$VENV_DIR/bin/python" - <<'PY'
import importlib.util
modules = ["fastapi", "pydantic", "neo4j"]
missing = [m for m in modules if importlib.util.find_spec(m) is None]
print("1" if missing else "0")
PY
)

if [ "$USE_STUBS" = "1" ]; then
  export PYTHONPATH="$ROOT_DIR/backend/_stubs:$PYTHONPATH"
fi

BACKEND_COV_ARGS=()
AIRFLOW_COV_ARGS=()
if "$VENV_DIR/bin/python" - <<'PY'
import importlib.util
import sys
sys.exit(0 if importlib.util.find_spec("pytest_cov") and importlib.util.find_spec("coverage") else 1)
PY
then
  BACKEND_COV_ARGS=(--cov=app --cov-report=term-missing --cov-report=xml:coverage.xml --cov-fail-under=80)
  AIRFLOW_COV_ARGS=(--cov=airflow --cov-report=term-missing --cov-report=xml:coverage.xml --cov-fail-under=80)
else
  echo "WARN: pytest-cov unavailable; running python tests without coverage gating" >&2
fi

(cd "$ROOT_DIR/backend" && "$VENV_DIR/bin/pytest" "${BACKEND_COV_ARGS[@]}")
(cd "$ROOT_DIR/airflow" && "$VENV_DIR/bin/pytest" "${AIRFLOW_COV_ARGS[@]}")
