.PHONY: up down logs ps

up:
	docker compose -f docker-compose.mcp.yml up -d --build

down:
	docker compose -f docker-compose.mcp.yml down -v

logs:
	docker compose -f docker-compose.mcp.yml logs -f

ps:
	docker compose -f docker-compose.mcp.yml ps
