.PHONY: dev test lint build run e2e clean help

help:
	@echo "Available commands:"
	@echo "  make dev    - Start the development stack (Docker Compose)"
	@echo "  make test   - Run unit tests"
	@echo "  make lint   - Run linting"
	@echo "  make build  - Build the TypeScript project"
	@echo "  make run    - Run the service locally (requires local DB or .env config)"
	@echo "  make e2e    - Run end-to-end smoke tests against running service"

dev:
	npm run dev:stack

test:
	npm test

lint:
	npm run lint

build:
	npm run build

run:
	npm run dev

e2e:
	./scripts/e2e-smoke.sh
