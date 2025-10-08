# Makefile for Maestro Conductor Docker GA Release

# Variables
TAG ?= v2025.10.07
COMPOSE_FILE ?= docker-ga-release/docker-compose.yml

# Docker Compose shorthand
DC := docker compose -f $(COMPOSE_FILE)

# Help target
.PHONY: help
help:
	@echo "Maestro Conductor Docker GA Release Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make up           Start all services"
	@echo "  make down         Stop all services"
	@echo "  make logs         View service logs"
	@echo "  make ps           List running services"
	@echo "  make rebuild      Rebuild all services"
	@echo "  make seed         Create Kafka topics (optional)"
	@echo "  make verify       Run release verification"
	@echo "  make evidence     Generate release evidence bundle"
	@echo "  make clean        Remove all containers and volumes"
	@echo ""
	@echo "Environment variables:"
	@echo "  TAG          Release tag (default: v2025.10.07)"
	@echo "  COMPOSE_FILE Docker Compose file (default: docker-ga-release/docker-compose.yml)"

# Start all services
.PHONY: up
up:
	$(DC) up -d

# Stop all services
.PHONY: down
down:
	$(DC) down

# View service logs
.PHONY: logs
logs:
	$(DC) logs -f

# List running services
.PHONY: ps
ps:
	$(DC) ps

# Rebuild all services
.PHONY: rebuild
rebuild:
	$(DC) build --no-cache

# Create Kafka topics (optional)
.PHONY: seed
seed:
	@echo "Creating Kafka topics..."
	# This would typically run a script to create topics in Redpanda
	# For now, we'll just show a message
	@echo "✅ Kafka topics created (mock implementation)"

# Run release verification
.PHONY: verify
verify:
	@echo "Running release verification..."
	npm run release:verify

# Generate release evidence bundle
.PHONY: evidence
evidence:
	@echo "Generating release evidence bundle..."
	npm run release:manifest
	npm run release:attest
	npm run release:verify

# Remove all containers and volumes
.PHONY: clean
clean:
	$(DC) down -v

# Default target
.PHONY: default
default: help