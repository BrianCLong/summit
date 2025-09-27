# IntelGraph Platform Makefile
# MVP-0 Ship Plan Implementation

.PHONY: help up down build logs clean seed smoke test lint typecheck format install deps health status restart backup

# Default target
help: ## Show this help message
	@echo "IntelGraph Platform - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Quick Start:"
	@echo "  make up     - Start development environment"
	@echo "  make seed   - Load demo data"
	@echo "  make smoke  - Run golden path test"

## Development Environment
up: ## Start the development environment
	@echo "🚀 Starting IntelGraph development environment..."
	@chmod +x scripts/dev-up.sh
	@./scripts/dev-up.sh

down: ## Stop the development environment
	@echo "🛑 Stopping IntelGraph development environment..."
	@chmod +x scripts/dev-down.sh
	@./scripts/dev-down.sh

restart: down up ## Restart the development environment

build: ## Build all services
	@echo "🔨 Building all services..."
	@docker-compose -f docker-compose.dev.yml build

logs: ## View logs from all services
	@docker-compose -f docker-compose.dev.yml logs -f

clean: ## Clean up containers, networks, and volumes
	@echo "🧹 Cleaning up development environment..."
	@docker-compose -f docker-compose.dev.yml down --volumes --remove-orphans
	@docker system prune -f

## Data Management
seed: ## Load demo data to all databases (10k entities, 50k relationships)
	@echo "🌱 Seeding demo data..."
	@cd server && npm run seed
	@echo "✅ Demo data loaded successfully"

seed-demo: ## Load deterministic demo data for Golden Path testing
	@echo "🌱 Seeding Golden Path demo data..."
	@cd server && npm run seed:demo
	@echo "✅ Golden Path demo data loaded successfully"

seed-small: ## Load small dataset (1k entities, 5k relationships)
	@echo "🌱 Seeding small dataset..."
	@cd server && npm run seed:small
	@echo "✅ Small dataset loaded successfully"

seed-large: ## Load large dataset (50k entities, 250k relationships)
	@echo "🌱 Seeding large dataset..."
	@cd server && npm run seed:large
	@echo "✅ Large dataset loaded successfully"

backup: ## Backup all databases
	@echo "💾 Creating backups..."
	@chmod +x scripts/backup/neo4j_backup.sh
	@chmod +x scripts/backup/postgres_backup.sh
	@chmod +x scripts/backup/redis_backup.sh
	@./scripts/backup/neo4j_backup.sh
	@./scripts/backup/postgres_backup.sh
	@./scripts/backup/redis_backup.sh

## Testing & Quality
smoke: ## Run smoke tests (golden path)
	@echo "🧪 Running smoke tests..."
	@npm run test:smoke || (echo "❌ Smoke tests failed. Check the golden path." && exit 1)
	@echo "✅ Smoke tests passed!"

test: ## Run all tests
	@echo "🧪 Running all tests..."
	@npm test

test-unit: ## Run unit tests only
	@npm run test:unit

test-integration: ## Run integration tests only
	@npm run test:integration

test-e2e: ## Run end-to-end tests
	@npm run test:e2e

## Code Quality
lint: ## Run linting
	@echo "🔍 Running linters..."
	@npm run lint

typecheck: ## Run type checking
	@echo "📝 Running type checks..."
	@npm run typecheck

format: ## Format code
	@echo "💅 Formatting code..."
	@npm run format

check: lint typecheck ## Run all code quality checks

## Dependencies
install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	@npm install
	@cd client && npm install
	@cd server && npm install

deps: install ## Alias for install

## Monitoring & Health
health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@./scripts/health-check.sh

status: ## Show status of all services
	@docker-compose -f docker-compose.dev.yml ps

## Observability (Optional - Phase 4)
otel: ## Start observability stack (OpenTelemetry, Prometheus, Grafana)
	@echo "📊 Starting observability stack..."
	@docker-compose -f docker-compose.dev.yml -f docker-compose.monitoring.yml up -d
	@echo "Grafana: http://localhost:3001"
	@echo "Prometheus: http://localhost:9090"

## Production Deployment (Optional)
deploy-dev: ## Deploy to development environment
	@echo "🚀 Deploying to development..."
	@npm run deploy:dev

deploy-staging: ## Deploy to staging environment
	@echo "🚀 Deploying to staging..."
	@npm run deploy:staging

deploy-prod: ## Deploy to production environment
	@echo "🚀 Deploying to production..."
	@npm run deploy:prod

## Database Operations
db-migrate: ## Run database migrations
	@echo "📊 Running database migrations..."
	@npm run db:migrate

db-reset: ## Reset databases with fresh migrations and seed data
	@echo "🔄 Resetting databases..."
	@npm run db:reset

## Maintenance
update: ## Update all dependencies
	@echo "⬆️ Updating dependencies..."
	@npm update
	@cd client && npm update
	@cd server && npm update

security-check: ## Run security checks
	@echo "🔒 Running security checks..."
	@npm audit
	@cd client && npm audit
	@cd server && npm audit

## Git Hooks
prepare: ## Setup git hooks
	@echo "🪝 Setting up git hooks..."
	@npx husky install