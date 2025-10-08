SHELL := /bin/bash
ENV_FILE ?= .env
include $(ENV_FILE)
export API_CONTEXT API_DOCKERFILE WEB_CONTEXT WEB_DOCKERFILE INTELGRAPH_TAG WEB_TAG

.DEFAULT_GOAL := help

help: ## List targets
	@.semgrep.yml -E '^[a-zA-Z0-9_-]+:.*?## ' Makefile | sort | \
	awk 'BEGIN {FS=":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

bootstrap: ## Build local images (multi-service)
	DOCKER_BUILDKIT=1 docker buildx build --load \
	-t summit/api:$(INTELGRAPH_TAG) -f $(API_DOCKERFILE) $(API_CONTEXT)
	DOCKER_BUILDKIT=1 docker buildx build --load \
	-t summit/web:$(WEB_TAG) -f $(WEB_DOCKERFILE) $(WEB_CONTEXT)

up: ## Start stack (no AWS)
	docker compose --env-file $(ENV_FILE) up -d

up-aws: ## Start with AWS creds sidecar
	docker compose --env-file $(ENV_FILE) --profile aws up -d

ps: ## Show services
	docker compose ps

logs: ## Tail logs
	docker compose logs -f --tail=200

restart: ## Rebuild API+WEB only
	docker compose up -d --build --no-deps api web

down: ## Stop
	docker compose down

clean: ## Stop + purge volumes
	docker compose down -v || true && docker system prune -f
