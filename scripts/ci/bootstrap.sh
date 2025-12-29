#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
PYTHON_BIN=${PYTHON:-python3}
VENV_DIR=${VENV_DIR:-"${ROOT_DIR}/.venv"}
COMPONENT=${1:-all}

# Ensure corepack is available so pnpm resolution matches lockfiles
if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

mkdir -p "$ROOT_DIR/.cache"

bootstrap_python() {
  if [ "${BOOTSTRAP_OFFLINE:-0}" = "1" ]; then
    echo "BOOTSTRAP_OFFLINE=1: skipping python dependency download" >&2
    return
  fi
  if [ ! -d "$VENV_DIR" ]; then
    "$PYTHON_BIN" -m venv --system-site-packages "$VENV_DIR"
  fi

  PIP="$VENV_DIR/bin/pip"
  # Prefer cached wheels when network egress is blocked
  if ! "$PIP" install --upgrade pip; then
    echo "Using existing pip (offline mode detected)." >&2
  fi

  if ! "$PIP" install --upgrade pytest pytest-cov coverage; then
    "$PIP" install pytest pytest-cov coverage --no-index --find-links /usr/share/pip-wheels || true
  fi

  if ! "$PIP" install -r "$ROOT_DIR/backend/requirements.txt"; then
    "$PIP" install -r "$ROOT_DIR/backend/requirements.txt" --no-index --find-links /usr/share/pip-wheels || true
  fi

  if ! "$PIP" install -r "$ROOT_DIR/airflow/requirements.txt"; then
    "$PIP" install -r "$ROOT_DIR/airflow/requirements.txt" --no-index --find-links /usr/share/pip-wheels || true
  fi

  "$VENV_DIR/bin/python" - <<'PY'
import importlib.util
import sys
required = ["pytest", "pytest_cov", "coverage"]
missing = [pkg for pkg in required if importlib.util.find_spec(pkg) is None]
if missing:
    sys.stderr.write(f"WARN: missing python tooling (likely offline): {', '.join(missing)}\n")
PY
}

bootstrap_js() {
  if [ "${BOOTSTRAP_OFFLINE:-0}" = "1" ]; then
    echo "BOOTSTRAP_OFFLINE=1: skipping pnpm install" >&2
    return
  fi
  if command -v pnpm >/dev/null 2>&1; then
    PNPM_HOME=${PNPM_HOME:-"$HOME/.local/share/pnpm"}
    export PNPM_HOME
    export PATH="$PNPM_HOME:$PATH"
    if ! pnpm install --dir "$ROOT_DIR/client" --frozen-lockfile --prefer-offline; then
      echo "WARN: pnpm lockfile drift detected; retrying without --frozen-lockfile" >&2
      pnpm install --dir "$ROOT_DIR/client" --prefer-offline --no-frozen-lockfile
    fi
  fi
}

bootstrap_rust() {
  if [ "${BOOTSTRAP_OFFLINE:-0}" = "1" ]; then
    echo "BOOTSTRAP_OFFLINE=1: skipping cargo fetch" >&2
    return
  fi
  if command -v cargo >/dev/null 2>&1; then
    (cd "$ROOT_DIR" && cargo fetch)
  fi
}

bootstrap_go() {
  if [ "${BOOTSTRAP_OFFLINE:-0}" = "1" ]; then
    echo "BOOTSTRAP_OFFLINE=1: skipping go mod download" >&2
    return
  fi
  if command -v go >/dev/null 2>&1; then
    (cd "$ROOT_DIR/sdk/go/abac" && go mod download)
  fi
}

case "$COMPONENT" in
  python)
    bootstrap_python
    ;;
  js|ts|node|client)
    bootstrap_js
    ;;
  rust)
    bootstrap_rust
    ;;
  go)
    bootstrap_go
    ;;
  all)
    bootstrap_python
    bootstrap_js
    bootstrap_rust
    bootstrap_go
    ;;
  *)
    echo "Unknown component: $COMPONENT" >&2
    exit 1
    ;;
esac
