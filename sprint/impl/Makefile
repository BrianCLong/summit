# IntelGraph Platform - Implementation Makefile

# This Makefile provides targets for IntelGraph platform development
# It calls through to repo-native targets while maintaining compatibility

.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help bootstrap test run dev up down smoke clean lint format typecheck

# Default target
help: ## Show this help message
	@echo "IntelGraph Platform Makefile - Available Targets:"
	@echo "==============================================="
	@echo "Use make <target> where <target> is one of:"
	@echo "  bootstrap    - install deps without side-effects"
	@echo "  test         - run sprint smoke tests"
	@echo "  test-unit    - Run unit tests"
	@echo "  test-e2e     - Run end-to-end tests"
	@echo "  test-smoke   - Run smoke tests through sprint"
	@echo "  dev          - run minimal stack (compose profile=smoke)"
	@echo "  up           - Start services via Docker (minimal compose profile)"
	@echo "  down         - Stop services via Docker"
	@echo "  smoke        - Run smoke tests for deployed platform"
	@echo "  lint         - Run linting tools"
	@echo "  format       - Format code"
	@echo "  typecheck    - Run TypeScript type checking"
	@echo "  db-migrate   - Run database migrations"
	@echo "  db-seed      - Seed database with sample data"
	@echo "  build        - Build platform for production"
	@echo "  build-client - Build client application"
	@echo "  build-server - Build server application"
	@echo "  clean        - Clean build artifacts"
	@echo "  health       - Check platform health"
	@echo "  install      - Install dependencies"
# Environment setup
bootstrap: ## install deps without side-effects
	@echo "Setting up IntelGraph development environment..."
	@cd /Users/brianlong/Developer/summit && npm run setup || true
	@echo "Bootstrap complete. Please ensure Docker is running for service startup."

# Testing targets
test: ## run sprint smoke tests
	@echo "Running IntelGraph test suite..."
	@cd /Users/brianlong/Developer/summit && npm run test

test-unit: ## Run unit tests
	@echo "Running unit tests..."
	@cd /Users/brianlong/Developer/summit && npm run test:unit

test-e2e: ## Run end-to-end tests
	@echo "Running end-to-end tests..."
	@cd /Users/brianlong/Developer/summit && npm run test:e2e

test-smoke: ## Run smoke tests through sprint
	@echo "Running smoke tests..."
	@cd /Users/brianlong/Developer/summit && node sprint/impl/tests_smoke/basic_smoke.test.js

# Development targets
dev: ## run minimal stack (compose profile=smoke)
	@echo "Starting IntelGraph in development mode..."
	@cd /Users/brianlong/Developer/summit && npm run dev

# Docker targets
up: ## Start services via Docker (minimal compose profile)
	@echo "Starting IntelGraph services via Docker..."
	@cd /Users/brianlong/Developer/summit && docker-compose --profile minimal up -d

down: ## Stop services via Docker
	@echo "Stopping IntelGraph services..."
	@cd /Users/brianlong/Developer/summit && docker-compose down

smoke: ## Run smoke tests for deployed platform
	@echo "Running smoke tests..."
	@cd /Users/brianlong/Developer/summit && npm run devkit:smoke

# Code quality targets
lint: ## Run linting tools
	@echo "Running linters..."
	@cd /Users/brianlong/Developer/summit && npm run lint

format: ## Format code
	@echo "Formatting code..."
	@cd /Users/brianlong/Developer/summit && npm run format

typecheck: ## Run TypeScript type checking
	@echo "Running TypeScript type checking..."
	@cd /Users/brianlong/Developer/summit && npm run typecheck

# Database operations
db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	@cd /Users/brianlong/Developer/summit && npm run db:migrate

db-seed: ## Seed database with sample data
	@echo "Seeding database..."
	@cd /Users/brianlong/Developer/summit && npm run db:seed

# Build operations
build: ## Build platform for production
	@echo "Building IntelGraph for production..."
	@cd /Users/brianlong/Developer/summit && npm run build

build-client: ## Build client application
	@echo "Building client application..."
	@cd /Users/brianlong/Developer/summit && npm run build:client

build-server: ## Build server application
	@echo "Building server application..."
	@cd /Users/brianlong/Developer/summit && npm run build:server

# Clean operations
clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	@cd /Users/brianlong/Developer/summit && rm -rf server/dist client/dist

# Health check
health: ## Check platform health
	@echo "Checking system health..."
	@cd /Users/brianlong/Developer/summit && npm run health

# Utility commands
install: ## Install dependencies
	@echo "Installing dependencies..."
	@cd /Users/brianlong/Developer/summit && npm install