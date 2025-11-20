.PHONY: bootstrap up up-ai smoke tools down

# Minimal, portable golden path. No assumptions about project layout.

SHELL := /usr/bin/env bash
NODE_VERSION ?= 18
PY_VERSION ?= 3.11
COMPOSE ?= ./scripts/run-compose.sh
DEV_COMPOSE_FILE ?= docker-compose.dev.yml
AI_COMPOSE_FILE ?= docker-compose.ai.yml
ENV_FILE ?= .env

bootstrap:
	@echo "==> bootstrap: node, python, envs"
	@if [ ! -f $(ENV_FILE) ]; then cp .env.example $(ENV_FILE) && echo "seeded $(ENV_FILE) from .env.example"; fi
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
	@if [ -f $(DEV_COMPOSE_FILE) ]; then \
	  $(COMPOSE) -f $(DEV_COMPOSE_FILE) --env-file $(ENV_FILE) up -d --build --remove-orphans; \
	  ./scripts/wait-for-stack.sh; \
	else \
	  echo "no compose file; skipping"; \
	fi

up-ai:
	@echo "==> up (AI profile)"
	@if [ -f $(AI_COMPOSE_FILE) ]; then \
	  $(COMPOSE) -f $(DEV_COMPOSE_FILE) -f $(AI_COMPOSE_FILE) --env-file $(ENV_FILE) up -d --build --remove-orphans; \
	  ./scripts/wait-for-stack.sh; \
	else \
	  echo "$(AI_COMPOSE_FILE) missing; run make up instead"; \
	fi

down:
	@echo "==> down: stopping summit stack"
	@if [ -f $(DEV_COMPOSE_FILE) ]; then \
	  $(COMPOSE) -f $(DEV_COMPOSE_FILE) down --remove-orphans || true; \
	fi

smoke:
	@echo "==> smoke: lightweight sanity checks"
	@if [ -f package.json ]; then \
	  if command -v pnpm >/dev/null 2>&1; then pnpm smoke; \
	  else npm run smoke; fi; \
	else \
	  echo "package.json missing; skipping JS smoke"; \
	fi
	@echo "smoke: DONE"

catalog\:list:
	@echo "==> catalog:list: browsing data catalog"
	@if [ -f scripts/catalog-list.ts ]; then \
	  node --loader ts-node/esm scripts/catalog-list.ts $(ARGS); \
	else \
	  echo "catalog-list.ts not found"; exit 1; \
	fi

catalog\:show:
	@echo "==> catalog:show: show dataset details"
	@if [ -z "$(DATASET_ID)" ]; then \
	  echo "Error: DATASET_ID required. Usage: make catalog:show DATASET_ID=<dataset-id>"; \
	  exit 1; \
	fi
	@if [ -f scripts/catalog-show.ts ]; then \
	  node --loader ts-node/esm scripts/catalog-show.ts $(DATASET_ID) $(ARGS); \
	else \
	  echo "catalog-show.ts not found"; exit 1; \
	fi

catalog\:stats:
	@echo "==> catalog:stats: catalog statistics"
	@if [ -f scripts/catalog-stats.ts ]; then \
	  node --loader ts-node/esm scripts/catalog-stats.ts $(ARGS); \
	else \
	  echo "catalog-stats.ts not found"; exit 1; \
	fi
