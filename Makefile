.PHONY: ci dev up down build
ci: ; npm ci && npm run lint && npm run typecheck && npm test
up: ; docker compose up -d --build
down: ; docker compose down -v
build: ; npm run build --workspaces || true
