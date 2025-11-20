# Observability Demo Makefile
# Make targets for running the SLO-driven alerting demonstration

.PHONY: help demo up down logs test-alert break-golden-path restore metrics dashboards clean

help: ## Show this help message
	@echo "Summit SLO-Driven Alerting Demo"
	@echo "================================"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

demo: ## Run full observability demo (alias for 'up')
	@$(MAKE) up
	@echo ""
	@echo "✅ Observability demo is running!"
	@echo ""
	@$(MAKE) info

up: ## Start all observability services
	@echo "🚀 Starting Summit observability stack..."
	@docker-compose up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo "✅ All services started!"

down: ## Stop all observability services
	@echo "🛑 Stopping Summit observability stack..."
	@docker-compose down

logs: ## Tail logs from all services
	@docker-compose logs -f

logs-prometheus: ## Tail Prometheus logs
	@docker-compose logs -f prometheus

logs-alertmanager: ## Tail Alertmanager logs
	@docker-compose logs -f alertmanager

logs-golden-path: ## Tail Golden Path exporter logs
	@docker-compose logs -f golden-path-exporter

logs-dora: ## Tail DORA exporter logs
	@docker-compose logs -f dora-exporter

info: ## Show URLs and status
	@echo "Summit Observability Stack"
	@echo "=========================="
	@echo ""
	@echo "📊 Dashboards & UIs:"
	@echo "  Prometheus:     http://localhost:9090"
	@echo "  Alertmanager:   http://localhost:9093"
	@echo "  Grafana:        http://localhost:3333 (admin/admin)"
	@echo ""
	@echo "📈 Metrics Exporters:"
	@echo "  Golden Path:    http://localhost:9465/metrics"
	@echo "  DORA Metrics:   http://localhost:9102/metrics"
	@echo ""
	@echo "🔍 Quick Links:"
	@echo "  SLO Recording Rules:  http://localhost:9090/rules"
	@echo "  Active Alerts:        http://localhost:9090/alerts"
	@echo "  Alert Routes:         http://localhost:9093/#/status"
	@echo ""
	@echo "📝 Documentation:"
	@echo "  SLO Guide:      ../docs/slo-guide.md"
	@echo "  Runbooks:       https://docs.summit.io/runbooks/"

test-alert: ## Trigger a test alert
	@echo "🚨 Triggering test alert..."
	@curl -X POST http://localhost:9093/api/v1/alerts \
		-H "Content-Type: application/json" \
		-d '[{"labels":{"alertname":"TestAlert","severity":"warning","slo":"test"},"annotations":{"summary":"Test alert from make test-alert"}}]'
	@echo ""
	@echo "✅ Test alert sent. Check Alertmanager UI: http://localhost:9093"

break-golden-path: ## Break golden path to trigger alert (for demo)
	@echo "💥 Breaking golden path by stopping a critical service..."
	@echo "This will cause SLO alerts to fire within 2-5 minutes."
	@docker-compose stop golden-path-exporter
	@echo ""
	@echo "Monitor alerts at: http://localhost:9090/alerts"
	@echo "Restore with: make restore"

restore: ## Restore golden path after breaking it
	@echo "🔧 Restoring golden path..."
	@docker-compose start golden-path-exporter
	@echo "✅ Golden path restored"

metrics: ## Show current SLO metrics
	@echo "Current SLO Metrics"
	@echo "==================="
	@echo ""
	@echo "Golden Path Success Rate:"
	@curl -s 'http://localhost:9090/api/v1/query?query=slo:golden_path:success_ratio:rate5m' | jq -r '.data.result[0].value[1] // "N/A"' | awk '{printf "  %.4f (%.2f%%)\n", $$1, $$1*100}'
	@echo ""
	@echo "Copilot p95 Latency:"
	@curl -s 'http://localhost:9090/api/v1/query?query=slo:copilot_latency:p95:rate5m' | jq -r '.data.result[0].value[1] // "N/A"' | awk '{printf "  %.0fms\n", $$1*1000}'
	@echo ""
	@echo "Ingestion Freshness:"
	@curl -s 'http://localhost:9090/api/v1/query?query=slo:ingestion_freshness:success_ratio:rate5m' | jq -r '.data.result[0].value[1] // "N/A"' | awk '{printf "  %.4f (%.2f%%)\n", $$1, $$1*100}'
	@echo ""
	@echo "Platform Health Score:"
	@curl -s 'http://localhost:9090/api/v1/query?query=slo:platform:health_score' | jq -r '.data.result[0].value[1] // "N/A"' | awk '{printf "  %.4f (%.2f%%)\n", $$1, $$1*100}'

dashboards: ## Open all dashboards in browser
	@echo "Opening dashboards..."
	@open http://localhost:9090 || xdg-open http://localhost:9090 || echo "Prometheus: http://localhost:9090"
	@open http://localhost:9093 || xdg-open http://localhost:9093 || echo "Alertmanager: http://localhost:9093"
	@open http://localhost:3333 || xdg-open http://localhost:3333 || echo "Grafana: http://localhost:3333"

benchmark: ## Run benchmark and generate baseline
	@echo "📊 Generating performance baseline..."
	@cd ../../benchmarks && node generate-baseline.js --prometheus-url=http://localhost:9090
	@echo ""
	@echo "✅ Baseline generated. Run 'make benchmark-compare' to compare current performance."

benchmark-compare: ## Compare current performance vs baseline
	@echo "📊 Comparing performance against baseline..."
	@cd ../../benchmarks && node compare-performance.js --prometheus-url=http://localhost:9090
	@echo ""

clean: ## Remove all data volumes
	@echo "🧹 Cleaning up volumes..."
	@docker-compose down -v
	@echo "✅ Cleanup complete"

restart: down up ## Restart all services

health: ## Check health of all services
	@echo "Health Check"
	@echo "============"
	@echo ""
	@echo -n "Prometheus:     "
	@curl -sf http://localhost:9090/-/healthy && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "Alertmanager:   "
	@curl -sf http://localhost:9093/-/healthy && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "Grafana:        "
	@curl -sf http://localhost:3333/api/health && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "Golden Path:    "
	@curl -sf http://localhost:9465/health && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "DORA:           "
	@curl -sf http://localhost:9102/health && echo "✅ Healthy" || echo "❌ Unhealthy"
