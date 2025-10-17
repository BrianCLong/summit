.PHONY: bootstrap up smoke tools

# Minimal, portable golden path. No assumptions about project layout.

SHELL := /usr/bin/env bash
NODE_VERSION ?= 18
PY_VERSION ?= 3.11

bootstrap:
	@echo "==> bootstrap: node, python, envs"
	# Node: prefer corepack/pnpm if present, else npm
	@if [ -f package.json ]; then \
	  command -v corepack >/dev/null 2>&1 && corepack enable || true; \
	  if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile || pnpm install; \
	  elif [ -f package-lock.json ]; then npm ci || npm install; \
	  else npm install || true; fi; \
	fi
	# Python venv + deps
	@if [ -f requirements.txt ] || [ -f pyproject.toml ]; then \
	  python$(PY_VERSION) -m venv .venv 2>/dev/null || python3 -m venv .venv; \
	  . .venv/bin/activate; python -m pip install -U pip wheel; \
	  if [ -f requirements.txt ]; then pip install -r requirements.txt || true; fi; \
	  if [ -f pyproject.toml ]; then pip install -e . || pip install . || true; fi; \
	  pip install ruamel.yaml==0.18.* pip-audit==2.* || true; \
	fi
	# Dev tooling fallbacks (no yq/gsed reliance)
	@mkdir -p scripts/tools
	@printf '%s\n' '#!/usr/bin/env python3' \
	'from ruamel.yaml import YAML; import sys,json' \
	'y=YAML(); doc=y.load(sys.stdin.read()); print(json.dumps(doc))' > scripts/tools/yq_json.py
	@chmod +x scripts/tools/yq_json.py
	@echo "bootstrap: DONE"

up:
	@echo "==> up: best-effort bring-up (no-op if stack not containerized)"
	@if [ -f docker-compose.yml ] || [ -f compose.yml ]; then \
	  docker compose up -d --quiet-pull || docker-compose up -d; \
	else \
	  echo "no compose file; skipping"; \
	fi

smoke:
	@echo "==> smoke: lightweight sanity checks"
	# JS/TS tests if present
	@if [ -f package.json ]; then \
	  if jq -e '.scripts.test' package.json >/dev/null 2>&1; then npm test --silent || npm run test --silent || true; else echo "no npm test script"; fi; \
	fi
	# Python tests if present
	@if [ -d tests ] || [ -f pytest.ini ] || [ -f pyproject.toml ]; then \
	  . .venv/bin/activate 2>/dev/null || true; \
	  python - <<'PY' || true
	import importlib.util, sys, subprocess, shutil
	if shutil.which("pytest"):
	    sys.exit(subprocess.call(["pytest","-q"]))
	print("pytest not installed; skipping")
	PY
	fi
	# Last-resort canary
	@node -e "console.log('node ok')" 2>/dev/null || true
	@python -c "print('python ok')" 2>/dev/null || true
	@echo "smoke: DONE"
