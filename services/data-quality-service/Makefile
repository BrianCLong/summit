.PHONY: help install build dev start test lint typecheck clean docker-build docker-run docker-stop k8s-deploy k8s-delete

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

build: ## Build TypeScript
	npm run build

dev: ## Start development server with hot reload
	npm run dev

start: build ## Start production server
	npm start

test: ## Run tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage
	npm test -- --coverage

lint: ## Lint code
	npm run lint

lint-fix: ## Lint and fix code
	npm run lint -- --fix

typecheck: ## Run TypeScript type checking
	npm run typecheck

clean: ## Clean build artifacts
	npm run clean
	rm -rf node_modules

check: typecheck lint test ## Run all checks (typecheck, lint, test)

docker-build: ## Build Docker image
	docker build -t data-quality-service:latest .

docker-run: ## Run Docker container
	docker-compose up -d

docker-stop: ## Stop Docker container
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f data-quality-service

docker-shell: ## Open shell in Docker container
	docker-compose exec data-quality-service sh

k8s-deploy: ## Deploy to Kubernetes
	kubectl apply -f k8s/

k8s-delete: ## Delete from Kubernetes
	kubectl delete -f k8s/

k8s-logs: ## View Kubernetes logs
	kubectl logs -f deployment/data-quality-service -n summit

k8s-port-forward: ## Port forward to Kubernetes pod
	kubectl port-forward svc/data-quality-service 3000:80 -n summit

format: ## Format code
	npx prettier --write "src/**/*.ts"

security-check: ## Run security audit
	npm audit

update-deps: ## Update dependencies
	npm update

prod-ready: clean install check build ## Prepare for production deployment
