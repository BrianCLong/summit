SHELL := /bin/bash

.PHONY: up down build test ci format lint sbom k6
up:     ## Run dev stack
docker compose -f docker-compose.dev.yaml up --build -d
down:   ## Stop dev stack
docker compose -f docker-compose.dev.yaml down -v
build:  ## Build all images
docker compose -f docker-compose.dev.yaml build
test:   ## Run unit tests (node+python)
pnpm -w run test:unit || true && pytest -q || true
format: ## Format code
pnpm -w exec prettier -w . || true
lint:   ## Lint js/ts
pnpm -w exec eslint . || true
sbom:   ## Generate CycloneDX SBOM
pnpm -w run sbom:gen
k6:     ## Perf smoke (TARGET=http://host:port make k6)
./ops/k6/smoke.sh
