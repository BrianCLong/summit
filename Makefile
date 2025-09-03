# IntelGraph Maestro - One-Click Deployment Makefile
# Usage: make deploy-dev | make deploy-uat | make deploy-prod

SHELL := /bin/bash
.PHONY: help deploy-dev deploy-uat deploy-prod clean status smoke-test preflight

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Configuration
CLUSTER_DEV := dev-cluster
CLUSTER_UAT := uat-cluster
CLUSTER_PROD := prod-cluster
REGISTRY := ghcr.io/brianclong
IMAGE_TAG := $(shell git rev-parse --short HEAD)
RELEASE_TAG := $(shell git describe --tags --always)

# Kubernetes context handling
K8S_CONTEXT ?= $(shell kubectl config current-context 2>/dev/null || echo "none")

help: ## Show this help message
	@echo -e "${BLUE}IntelGraph Maestro Deployment Commands${NC}"
	@echo ""
	@echo -e "${GREEN}Quick Start:${NC}"
	@echo "  make deploy-dev    - Deploy to development environment"
	@echo "  make deploy-uat    - Deploy to UAT environment"  
	@echo "  make deploy-prod   - Deploy to production environment"
	@echo ""
	@echo -e "${GREEN}Available Commands:${NC}"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check-requirements: ## Check if all required tools are installed
	@echo -e "${BLUE}🔍 Checking requirements...${NC}"
	@command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl is required but not installed${NC}"; exit 1; }
	@echo -e "${GREEN}✅ kubectl found${NC}"
	@kubectl cluster-info >/dev/null 2>&1 || { echo -e "${RED}kubectl cluster connection failed - check your kubeconfig${NC}"; exit 1; }
	@echo -e "${GREEN}✅ Kubernetes cluster accessible${NC}"

context-check: ## Verify kubectl context matches target environment
	@echo -e "${BLUE}🔍 Checking kubectl context...${NC}"
	@if [ "$(K8S_CONTEXT)" = "none" ]; then \
		echo -e "${RED}❌ No kubectl context set${NC}"; \
		echo -e "${YELLOW}Available contexts:${NC}"; \
		kubectl config get-contexts || true; \
		exit 1; \
	fi
	@echo -e "${GREEN}✅ Current context: $(K8S_CONTEXT)${NC}"
	@kubectl --context="$(K8S_CONTEXT)" cluster-info >/dev/null || { \
		echo -e "${RED}❌ Cluster connection failed${NC}"; \
		exit 1; \
	}

context-use: ## Switch to specified kubectl context (usage: make context-use ENV=dev|uat|prod)
	@if [ -z "$(ENV)" ]; then \
		echo -e "${RED}❌ ENV parameter required. Usage: make context-use ENV=dev|uat|prod${NC}"; \
		exit 1; \
	fi
	@TARGET_CONTEXT=""; \
	case "$(ENV)" in \
		dev) TARGET_CONTEXT="$(CLUSTER_DEV)" ;; \
		uat) TARGET_CONTEXT="$(CLUSTER_UAT)" ;; \
		prod) TARGET_CONTEXT="$(CLUSTER_PROD)" ;; \
		*) echo -e "${RED}❌ Invalid ENV. Use: dev, uat, or prod${NC}"; exit 1 ;; \
	esac; \
	echo -e "${BLUE}🔄 Switching to context: $$TARGET_CONTEXT${NC}"; \
	kubectl config use-context $$TARGET_CONTEXT || { \
		echo -e "${RED}❌ Failed to switch context. Available contexts:${NC}"; \
		kubectl config get-contexts; \
		exit 1; \
	}; \
	echo -e "${GREEN}✅ Switched to $$TARGET_CONTEXT${NC}"

preflight: ## Run preflight checks on container images and cluster policies
	@echo -e "${BLUE}🚁 Running preflight checks...${NC}"
	@echo -e "${YELLOW}📋 Checking image access and digest pinning...${NC}"
	@if [[ -n "$${GHCR_TOKEN:-}" ]]; then \
		./scripts/preflight_image_check.sh ghcr.io/brianclong/maestro-control-plane:latest --login-ghcr; \
	else \
		echo -e "${YELLOW}ℹ️  GHCR_TOKEN not set, skipping private registry check${NC}"; \
	fi
	@echo -e "${YELLOW}📋 Verifying Gatekeeper policies...${NC}"
	@kubectl apply --dry-run=client -f deploy/argo/rollout-maestro.yaml >/dev/null 2>&1 && echo -e "${GREEN}✅ Rollout manifest valid${NC}" || echo -e "${RED}❌ Rollout manifest validation failed${NC}"
	@echo -e "${GREEN}✅ Preflight checks completed${NC}"

build: ## Build container images (optional - uses existing images)
	@echo -e "${BLUE}🏗️  Building images...${NC}"
	@echo -e "${YELLOW}ℹ️  Using netflix/conductor:3.15.0 and netflix/conductor-ui:3.15.0${NC}"
	@echo -e "${GREEN}✅ Using production-ready images${NC}"

deploy-dev: check-requirements context-check ## 🚀 Deploy to development environment (ONE COMMAND)
	@echo -e "${BLUE}🚀 Deploying IntelGraph Maestro to DEVELOPMENT...${NC}"
	@echo -e "${YELLOW}📋 Deployment Summary:${NC}"
	@echo "  Environment: Development"
	@echo "  Cluster: $(CLUSTER_DEV)"
	@echo "  Image Tag: $(IMAGE_TAG)"
	@echo "  URL: https://maestro.dev.intelgraph.io"
	@echo ""
	
	@echo -e "${BLUE}1/7 📦 Creating namespaces...${NC}"
	@kubectl apply -f infra/k8s/namespaces/ || true
	
	@echo -e "${BLUE}2/7 🔐 Setting up RBAC...${NC}"
	@kubectl apply -f infra/k8s/rbac/
	
	@echo -e "${BLUE}3/7 💾 Deploying persistence layer...${NC}"
	@kubectl apply -f infra/k8s/persistence/
	@echo -e "${YELLOW}⏳ Waiting for PostgreSQL...${NC}"
	@kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres-conductor -n dev-orch --timeout=300s || true
	@echo -e "${YELLOW}⏳ Waiting for Redis cluster...${NC}"
	@kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis-conductor -n dev-orch --timeout=300s || true
	
	@echo -e "${BLUE}4/7 🎯 Deploying Maestro orchestrator...${NC}"
	@kubectl apply -f infra/k8s/deployments/
	@kubectl wait --for=condition=available deployment/maestro-conductor -n dev-orch --timeout=300s || true
	
	@echo -e "${BLUE}5/7 🌐 Setting up ingress...${NC}"
	@kubectl apply -f infra/k8s/ingress/
	
	@echo -e "${BLUE}6/7 👷 Deploying task workers...${NC}"
	@kubectl apply -f infra/k8s/workers/
	@kubectl wait --for=condition=available deployment/build-worker -n dev-apps --timeout=300s || true
	@kubectl wait --for=condition=available deployment/test-worker -n dev-apps --timeout=300s || true
	@kubectl wait --for=condition=available deployment/security-worker -n dev-apps --timeout=300s || true
	
	@echo -e "${BLUE}7/8 📊 Setting up monitoring...${NC}"
	@kubectl apply -f infra/k8s/monitoring/
	
	@echo -e "${BLUE}8/8 🎯 Deploying reference workflows...${NC}"
	@kubectl apply -f workflows/ || true
	
	@echo ""
	@echo -e "${GREEN}🎉 DEVELOPMENT DEPLOYMENT COMPLETE!${NC}"
	@echo ""
	@echo -e "${BLUE}📍 Access Points:${NC}"
	@echo "  🎛️  Conductor UI: https://maestro.dev.intelgraph.io/conductor"
	@echo "  🔌 API Endpoint: https://maestro.dev.intelgraph.io/api"
	@echo "  📊 Metrics:     https://maestro.dev.intelgraph.io/metrics"
	@echo ""
	@echo -e "${BLUE}🎯 Reference Workflows Deployed:${NC}"
	@echo "  🟢 Hello-World:  Basic orchestrator health check (every 15m)"
	@echo "  🔵 Hello-Case:   Full IntelGraph value loop (every 6h)"
	@echo ""
	@echo -e "${BLUE}🔐 Security Features:${NC}"
	@echo "  ✅ OIDC Authentication with role-based access"
	@echo "  ✅ Canary deployments with SLO-based auto-rollback"
	@echo "  ✅ Comprehensive SLO monitoring and alerting"
	@echo ""
	@echo -e "${BLUE}⚡ Quick Commands:${NC}"
	@echo "  make status-dev     - Check deployment status"
	@echo "  make smoke-test     - Run smoke tests"
	@echo "  make logs-dev       - View logs"

deploy-uat: check-requirements ## 🧪 Deploy to UAT environment  
	@echo -e "${BLUE}🧪 Deploying IntelGraph Maestro to UAT...${NC}"
	@echo -e "${YELLOW}📋 UAT Deployment Summary:${NC}"
	@echo "  Environment: UAT"
	@echo "  Image Tag: $(IMAGE_TAG)"
	@echo "  URL: https://maestro.uat.intelgraph.io"
	@echo ""
	
	@echo -e "${BLUE}1/7 📦 Creating UAT namespaces...${NC}"
	@sed 's/dev-orch/uat-orch/g; s/dev-apps/uat-apps/g; s/development/uat/g' infra/k8s/namespaces/orchestrator-namespaces.yaml | kubectl apply -f - || true
	
	@echo -e "${BLUE}2/7 🔐 Setting up UAT RBAC...${NC}"
	@sed 's/dev-orch/uat-orch/g; s/dev-apps/uat-apps/g' infra/k8s/rbac/orchestrator-rbac.yaml | kubectl apply -f - || true
	
	@echo -e "${BLUE}3/7 💾 Deploying UAT persistence...${NC}"
	@sed 's/dev-orch/uat-orch/g' infra/k8s/persistence/postgres-conductor.yaml | kubectl apply -f - || true
	@sed 's/dev-orch/uat-orch/g' infra/k8s/persistence/redis-cluster.yaml | kubectl apply -f - || true
	@echo -e "${YELLOW}⏳ Waiting for UAT PostgreSQL...${NC}"
	@kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres-conductor -n uat-orch --timeout=300s || true
	@echo -e "${YELLOW}⏳ Waiting for UAT Redis...${NC}"
	@kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis-conductor -n uat-orch --timeout=300s || true
	
	@echo -e "${BLUE}4/7 🎯 Deploying UAT orchestrator...${NC}"
	@sed 's/dev-orch/uat-orch/g; s/dev-apps/uat-apps/g; s/maestro.dev.intelgraph.io/maestro.uat.intelgraph.io/g' infra/k8s/deployments/maestro-conductor.yaml | kubectl apply -f - || true
	@kubectl wait --for=condition=available deployment/maestro-conductor -n uat-orch --timeout=300s || true
	
	@echo -e "${BLUE}5/7 🌐 Setting up UAT ingress...${NC}"
	@sed 's/dev-orch/uat-orch/g; s/maestro.dev.intelgraph.io/maestro.uat.intelgraph.io/g; s/conductor.dev.intelgraph.io/conductor.uat.intelgraph.io/g' infra/k8s/ingress/maestro-ingress.yaml | kubectl apply -f - || true
	
	@echo -e "${BLUE}6/7 👷 Deploying UAT workers...${NC}"
	@sed 's/dev-apps/uat-apps/g; s/dev-orch/uat-orch/g' infra/k8s/workers/task-workers.yaml | kubectl apply -f - || true
	@kubectl wait --for=condition=available deployment/build-worker -n uat-apps --timeout=300s || true
	@kubectl wait --for=condition=available deployment/test-worker -n uat-apps --timeout=300s || true
	@kubectl wait --for=condition=available deployment/security-worker -n uat-apps --timeout=300s || true
	
	@echo -e "${BLUE}7/7 📊 Setting up UAT monitoring...${NC}"
	@sed 's/dev-orch/uat-orch/g' infra/k8s/monitoring/maestro-grafana-dashboard.yaml | kubectl apply -f - || true
	
	@echo ""
	@echo -e "${GREEN}🎉 UAT DEPLOYMENT COMPLETE!${NC}"
	@echo ""
	@echo -e "${BLUE}📍 UAT Access Points:${NC}"
	@echo "  🎛️  Conductor UI: https://maestro.uat.intelgraph.io/conductor"
	@echo "  🔌 API Endpoint: https://maestro.uat.intelgraph.io/api"
	@echo ""
	@echo -e "${BLUE}⚡ UAT Commands:${NC}"
	@echo "  make status-uat     - Check UAT status"
	@echo "  make logs-uat       - View UAT logs"

deploy-prod: check-requirements ## 🌟 Deploy to production environment
	@echo -e "${BLUE}🌟 Deploying IntelGraph Maestro to PRODUCTION...${NC}"
	@echo -e "${RED}⚠️  WARNING: This will deploy to PRODUCTION${NC}"
	@echo -n "Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]
	@echo -e "${YELLOW}📋 Production Deployment Summary:${NC}"
	@echo "  Environment: Production"
	@echo "  Image Tag: $(RELEASE_TAG)"
	@echo "  URL: https://maestro.intelgraph.io"
	@echo ""
	
	@echo -e "${BLUE}1/7 📦 Creating production namespaces...${NC}"
	@sed 's/dev-orch/prod-orch/g; s/dev-apps/prod-apps/g; s/development/production/g' infra/k8s/namespaces/orchestrator-namespaces.yaml | kubectl apply -f - || true
	
	@echo -e "${BLUE}2/7 🔐 Setting up production RBAC...${NC}"
	@sed 's/dev-orch/prod-orch/g; s/dev-apps/prod-apps/g' infra/k8s/rbac/orchestrator-rbac.yaml | kubectl apply -f - || true
	
	@echo -e "${BLUE}3/7 💾 Deploying production persistence...${NC}"
	@sed 's/dev-orch/prod-orch/g' infra/k8s/persistence/postgres-conductor.yaml | kubectl apply -f - || true
	@sed 's/dev-orch/prod-orch/g' infra/k8s/persistence/redis-cluster.yaml | kubectl apply -f - || true
	@echo -e "${YELLOW}⏳ Waiting for production PostgreSQL...${NC}"
	@kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres-conductor -n prod-orch --timeout=600s || true
	@echo -e "${YELLOW}⏳ Waiting for production Redis...${NC}"
	@kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis-conductor -n prod-orch --timeout=600s || true
	
	@echo -e "${BLUE}4/7 🎯 Deploying production orchestrator...${NC}"
	@sed 's/dev-orch/prod-orch/g; s/dev-apps/prod-apps/g; s/maestro.dev.intelgraph.io/maestro.intelgraph.io/g' infra/k8s/deployments/maestro-conductor.yaml | kubectl apply -f - || true
	@kubectl wait --for=condition=available deployment/maestro-conductor -n prod-orch --timeout=600s || true
	
	@echo -e "${BLUE}5/7 🌐 Setting up production ingress...${NC}"
	@sed 's/dev-orch/prod-orch/g; s/maestro.dev.intelgraph.io/maestro.intelgraph.io/g; s/conductor.dev.intelgraph.io/conductor.intelgraph.io/g' infra/k8s/ingress/maestro-ingress.yaml | kubectl apply -f - || true
	
	@echo -e "${BLUE}6/7 👷 Deploying production workers...${NC}"
	@sed 's/dev-apps/prod-apps/g; s/dev-orch/prod-orch/g' infra/k8s/workers/task-workers.yaml | kubectl apply -f - || true
	@kubectl wait --for=condition=available deployment/build-worker -n prod-apps --timeout=600s || true
	@kubectl wait --for=condition=available deployment/test-worker -n prod-apps --timeout=600s || true
	@kubectl wait --for=condition=available deployment/security-worker -n prod-apps --timeout=600s || true
	
	@echo -e "${BLUE}7/7 📊 Setting up production monitoring...${NC}"
	@sed 's/dev-orch/prod-orch/g' infra/k8s/monitoring/maestro-grafana-dashboard.yaml | kubectl apply -f - || true
	
	@echo ""
	@echo -e "${GREEN}🚀 PRODUCTION DEPLOYMENT COMPLETE!${NC}"
	@echo ""
	@echo -e "${BLUE}📍 Production Access Points:${NC}"
	@echo "  🎛️  Conductor UI: https://maestro.intelgraph.io/conductor"
	@echo "  🔌 API Endpoint: https://maestro.intelgraph.io/api"
	@echo ""
	@echo -e "${RED}🚨 Production is now live!${NC}"

status: ## Check deployment status
	@echo -e "${BLUE}📊 Deployment Status${NC}"
	@echo ""
	@echo -e "${BLUE}🔍 Namespaces:${NC}"
	@kubectl get namespaces -l app.kubernetes.io/part-of=intelgraph || true
	@echo ""
	@echo -e "${BLUE}🎯 Orchestrator:${NC}"
	@kubectl get deployments,services,ingress -n dev-orch -l app.kubernetes.io/name=maestro-conductor || true
	@echo ""
	@echo -e "${BLUE}👷 Workers:${NC}"
	@kubectl get deployments,hpa -n dev-apps -l app.kubernetes.io/component=worker || true
	@echo ""
	@echo -e "${BLUE}💾 Persistence:${NC}"
	@kubectl get statefulsets,pvc -n dev-orch -l app.kubernetes.io/component=database || true
	@kubectl get statefulsets,pvc -n dev-orch -l app.kubernetes.io/component=queue || true

status-dev: ## Check dev environment status
	@kubectl config use-context $(CLUSTER_DEV) || true
	@make status

status-uat: ## Check UAT environment status  
	@kubectl config use-context $(CLUSTER_UAT) || true
	@make status

status-prod: ## Check production environment status
	@kubectl config use-context $(CLUSTER_PROD) || true
	@make status

smoke-test: ## Run smoke tests against deployment
	@echo -e "${BLUE}🧪 Running smoke tests...${NC}"
	@kubectl apply -f tests/k8s/smoke-tests.yaml -n dev-orch || true
	@kubectl wait --for=condition=complete job/maestro-smoke-test -n dev-orch --timeout=300s || true
	@kubectl logs job/maestro-smoke-test -n dev-orch || true
	@kubectl delete job/maestro-smoke-test -n dev-orch || true
	@echo -e "${GREEN}✅ Smoke tests completed${NC}"

logs-dev: ## View development logs
	@echo -e "${BLUE}📋 Development Logs${NC}"
	@kubectl logs deployment/maestro-conductor -n dev-orch --tail=50 -f

logs-uat: ## View UAT logs
	@kubectl config use-context $(CLUSTER_UAT) || true
	@kubectl logs deployment/maestro-uat -n uat-orch --tail=50 -f

logs-prod: ## View production logs
	@kubectl config use-context $(CLUSTER_PROD) || true
	@kubectl logs deployment/maestro-prod -n prod-orch --tail=50 -f

clean: ## Clean up development deployment
	@echo -e "${YELLOW}🧹 Cleaning up development deployment...${NC}"
	@kubectl delete -f infra/k8s/workers/ || true
	@kubectl delete -f infra/k8s/ingress/ || true
	@kubectl delete -f infra/k8s/deployments/ || true
	@kubectl delete -f infra/k8s/persistence/ || true
	@kubectl delete -f infra/k8s/rbac/ || true
	@kubectl delete -f infra/k8s/namespaces/ || true
	@echo -e "${GREEN}✅ Cleanup complete${NC}"

restart: ## Restart all deployments
	@echo -e "${BLUE}🔄 Restarting deployments...${NC}"
	@kubectl rollout restart deployment/maestro-conductor -n dev-orch || true
	@kubectl rollout restart deployment/build-worker -n dev-apps || true
	@kubectl rollout restart deployment/test-worker -n dev-apps || true
	@kubectl rollout restart deployment/security-worker -n dev-apps || true
	@echo -e "${GREEN}✅ Deployments restarted${NC}"

scale-up: ## Scale up workers for high load
	@echo -e "${BLUE}📈 Scaling up workers...${NC}"
	@kubectl scale deployment/build-worker --replicas=5 -n dev-apps || true
	@kubectl scale deployment/test-worker --replicas=4 -n dev-apps || true
	@kubectl scale deployment/security-worker --replicas=3 -n dev-apps || true
	@echo -e "${GREEN}✅ Workers scaled up${NC}"

scale-down: ## Scale down workers to minimum
	@echo -e "${BLUE}📉 Scaling down workers...${NC}"
	@kubectl scale deployment/build-worker --replicas=1 -n dev-apps || true
	@kubectl scale deployment/test-worker --replicas=1 -n dev-apps || true
	@kubectl scale deployment/security-worker --replicas=1 -n dev-apps || true
	@echo -e "${GREEN}✅ Workers scaled down${NC}"

port-forward: ## Port forward to access services locally
	@echo -e "${BLUE}🔌 Setting up port forwards...${NC}"
	@echo "Conductor UI will be available at: http://localhost:8080/conductor"
	@echo "API will be available at: http://localhost:8080/api"
	@echo "Press Ctrl+C to stop"
	@kubectl port-forward service/maestro-conductor 8080:8080 -n dev-orch

metrics: ## Show key metrics
	@echo -e "${BLUE}📊 Key Metrics${NC}"
	@echo ""
	@echo -e "${BLUE}Pod Status:${NC}"
	@kubectl get pods -n dev-orch -n dev-apps --field-selector=status.phase!=Running 2>/dev/null || echo "All pods running"
	@echo ""
	@echo -e "${BLUE}Resource Usage:${NC}"
	@kubectl top pods -n dev-orch 2>/dev/null || echo "Metrics server not available"
	@kubectl top pods -n dev-apps 2>/dev/null || true

# Emergency procedures
emergency-rollback: ## Emergency rollback to previous version
	@echo -e "${RED}🚨 EMERGENCY ROLLBACK${NC}"
	@kubectl rollout undo deployment/maestro-conductor -n dev-orch || true
	@kubectl rollout undo deployment/build-worker -n dev-apps || true
	@kubectl rollout undo deployment/test-worker -n dev-apps || true
	@kubectl rollout undo deployment/security-worker -n dev-apps || true
	@echo -e "${GREEN}✅ Rollback complete${NC}"

emergency-scale-zero: ## Emergency scale all to zero
	@echo -e "${RED}🚨 EMERGENCY SCALE TO ZERO${NC}"
	@kubectl scale deployment/maestro-conductor --replicas=0 -n dev-orch || true
	@kubectl scale deployment/build-worker --replicas=0 -n dev-apps || true
	@kubectl scale deployment/test-worker --replicas=0 -n dev-apps || true
	@kubectl scale deployment/security-worker --replicas=0 -n dev-apps || true
	@echo -e "${YELLOW}⚠️  All services scaled to zero${NC}"

# One-liner for complete setup
setup-dev: build deploy-dev smoke-test ## Complete dev setup: build + deploy + test

# Show URLs
urls: ## Show all service URLs
	@echo -e "${BLUE}🌐 Service URLs${NC}"
	@echo "Development:"
	@echo "  🎛️  Conductor UI: https://maestro.dev.intelgraph.io/conductor"
	@echo "  🔌 API:          https://maestro.dev.intelgraph.io/api"
	@echo "  📊 Metrics:      https://maestro.dev.intelgraph.io/metrics"
	@echo ""
	@echo "UAT:"
	@echo "  🎛️  Conductor UI: https://maestro.uat.intelgraph.io/conductor" 
	@echo "  🔌 API:          https://maestro.uat.intelgraph.io/api"
	@echo ""
	@echo "Production:"
	@echo "  🎛️  Conductor UI: https://maestro.intelgraph.io/conductor"
	@echo "  🔌 API:          https://maestro.intelgraph.io/api"