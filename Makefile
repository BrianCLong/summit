COMPOSE := docker compose -f ops/compose/docker-compose.yml
SMOKE ?= ./scripts/smoke_orchestrator.sh

.PHONY: up down logs ps rebuild verify
up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f --tail=200

ps:
	$(COMPOSE) ps

rebuild:
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d --force-recreate

verify:
	$(SMOKE)

.PHONY: hooks-fix hooks-run hooks-install
hooks-install:
	pre-commit install --install-hooks -t pre-commit -t commit-msg

hooks-run:
	pre-commit run --all-files

hooks-fix:
	./scripts/fix_precommit.sh

.PHONY: helm-lint
helm-lint:
	helm dependency build infra/helm/intelgraph || true
	helm lint infra/helm/intelgraph -f infra/helm/intelgraph/values/lint-defaults.yaml
