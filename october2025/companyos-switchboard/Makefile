SHELL := /bin/bash
.ONESHELL:
.DEFAULT_GOAL := help

help: ## Show help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

bootstrap: ## One-time bootstrap (node, rust, deps)
	@if ! command -v node >/dev/null; then echo "Please install Node.js >= 20"; exit 1; fi
	@if ! command -v cargo >/dev/null; then echo "Please install Rust toolchain (rustup + cargo)"; exit 1; fi
	npm install
	cd apps/web && npm install
	cd src-tauri && cargo fetch

dev: ## Run web app in dev mode
	cd apps/web && npm run dev

build: ## Build web app
	cd apps/web && npm run build

tauri-dev: ## Run Tauri dev (desktop shell)
	cd src-tauri && cargo tauri dev || (echo "If cargo-tauri missing: cargo install tauri-cli"; exit 1)

policy-test: ## Run OPA policy fmt/test
	@if ! command -v opa >/dev/null; then echo "Install OPA: https://www.openpolicyagent.org/docs/latest/#running-opa"; exit 1; fi
	opa fmt -w policies
	opa test policies -v

compose-up: ## Start local infra (SFU/TURN/NATS/OPA)
	docker compose -f deploy/local/docker-compose.switchboard.yml up -d

compose-down: ## Stop local infra
	docker compose -f deploy/local/docker-compose.switchboard.yml down
