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