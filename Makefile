SHELL := /bin/bash

include .env 2>/dev/null || true

.PHONY: up down logs ps seed verify-claim fmt lint

up:
docker compose up -d --build

down:
docker compose down -v

logs:
docker compose logs -f --tail=200

ps:
docker compose ps

seed:
@echo "(seeded via tools/seed.sql on first boot)"

verify-claim:
@curl -sS http://localhost:8101/manifest/$$ID | jq .

fmt:
@echo "(team-local formatters run in each service)"

lint:
@echo "(repo-wide lint placeholder)"
