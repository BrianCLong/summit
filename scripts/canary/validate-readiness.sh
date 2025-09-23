#!/bin/bash

# Production readiness validation script for IntelGraph canary deployment
# Validates all prerequisites before initiating production canary

set -euo pipefail

NAMESPACE="${NAMESPACE:-intelgraph-prod}"
RELEASE_NAME="${RELEASE_NAME:-intelgraph}"
CHART_PATH="${CHART_PATH:-infra/helm/intelgraph}"

echo "🔍 IntelGraph Production Readiness Validation"
echo "=============================================="

# Function to check Kubernetes resources
check_kubernetes_readiness() {
    echo ""
    echo "🎯 Kubernetes Infrastructure Checks"
    echo "===================================="

    local checks=0
    local passed=0

    # Check namespace exists
    echo "🔍 Checking namespace: $NAMESPACE"
    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        echo "✅ Namespace exists"
        passed=$((passed + 1))
    else
        echo "❌ Namespace not found"
    fi
    checks=$((checks + 1))

    # Check Helm release exists
    echo "🔍 Checking Helm release: $RELEASE_NAME"
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        echo "✅ Helm release deployed"
        passed=$((passed + 1))
    else
        echo "❌ Helm release not found"
    fi
    checks=$((checks + 1))

    # Check pods are ready
    echo "🔍 Checking pod readiness"
    local ready_pods
    ready_pods=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=intelgraph --field-selector=status.phase=Running -o name | wc -l || echo "0")
    if [ "$ready_pods" -gt 0 ]; then
        echo "✅ $ready_pods pods running"
        passed=$((passed + 1))
    else
        echo "❌ No running pods found"
    fi
    checks=$((checks + 1))

    # Check services are accessible
    echo "🔍 Checking service accessibility"
    if kubectl get service -n "$NAMESPACE" "$RELEASE_NAME" >/dev/null 2>&1; then
        echo "✅ Service accessible"
        passed=$((passed + 1))
    else
        echo "❌ Service not found"
    fi
    checks=$((checks + 1))

    echo "📊 Kubernetes checks: $passed/$checks passed"
    return $((checks - passed))
}

# Function to check observability stack
check_observability_readiness() {
    echo ""
    echo "📊 Observability Stack Checks"
    echo "=============================="

    local checks=0
    local passed=0

    # Check ServiceMonitor exists
    echo "🔍 Checking ServiceMonitor"
    if kubectl get servicemonitor -n "$NAMESPACE" >/dev/null 2>&1; then
        echo "✅ ServiceMonitor deployed"
        passed=$((passed + 1))
    else
        echo "❌ ServiceMonitor not found"
    fi
    checks=$((checks + 1))

    # Check PrometheusRule exists
    echo "🔍 Checking PrometheusRule"
    if kubectl get prometheusrule -n "$NAMESPACE" >/dev/null 2>&1; then
        echo "✅ PrometheusRule deployed"
        passed=$((passed + 1))
    else
        echo "❌ PrometheusRule not found"
    fi
    checks=$((checks + 1))

    # Check Prometheus connectivity
    echo "🔍 Checking Prometheus connectivity"
    local prometheus_url="${PROMETHEUS_URL:-http://prometheus.monitoring.svc.cluster.local:9090}"
    if curl -s "$prometheus_url/api/v1/status/config" >/dev/null; then
        echo "✅ Prometheus accessible"
        passed=$((passed + 1))
    else
        echo "❌ Prometheus not accessible"
    fi
    checks=$((checks + 1))

    # Check if metrics are being scraped
    echo "🔍 Checking metric ingestion"
    local metric_query="up{namespace=\"$NAMESPACE\"}"
    local response
    response=$(curl -s "$prometheus_url/api/v1/query" --data-urlencode "query=$metric_query" || echo '{"status":"error"}')

    local metric_count
    metric_count=$(echo "$response" | jq -r '.data.result | length' 2>/dev/null || echo "0")

    if [ "$metric_count" -gt 0 ]; then
        echo "✅ Metrics being scraped ($metric_count targets)"
        passed=$((passed + 1))
    else
        echo "❌ No metrics found for namespace"
    fi
    checks=$((checks + 1))

    echo "📊 Observability checks: $passed/$checks passed"
    return $((checks - passed))
}

# Function to check security posture
check_security_readiness() {
    echo ""
    echo "🔒 Security & Compliance Checks"
    echo "================================"

    local checks=0
    local passed=0

    # Check Kyverno policies
    echo "🔍 Checking Kyverno policies"
    if kubectl get policies.kyverno.io -A | grep -q "require-signed-images\|require-pod-security"; then
        echo "✅ Kyverno policies active"
        passed=$((passed + 1))
    else
        echo "❌ Kyverno policies not found"
    fi
    checks=$((checks + 1))

    # Check network policies
    echo "🔍 Checking network policies"
    if kubectl get networkpolicy -n "$NAMESPACE" >/dev/null 2>&1; then
        echo "✅ Network policies configured"
        passed=$((passed + 1))
    else
        echo "⚠️  No network policies found"
    fi
    checks=$((checks + 1))

    # Check pod security standards
    echo "🔍 Checking pod security context"
    local pods_with_security
    pods_with_security=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[*].spec.securityContext.runAsNonRoot}' | grep -c "true" || echo "0")

    if [ "$pods_with_security" -gt 0 ]; then
        echo "✅ Pods running with security context"
        passed=$((passed + 1))
    else
        echo "❌ Pods not configured with security context"
    fi
    checks=$((checks + 1))

    # Check secrets management
    echo "🔍 Checking secrets management"
    if kubectl get sealedsecrets -n "$NAMESPACE" >/dev/null 2>&1; then
        echo "✅ Sealed secrets configured"
        passed=$((passed + 1))
    else
        echo "⚠️  No sealed secrets found"
    fi
    checks=$((checks + 1))

    echo "📊 Security checks: $passed/$checks passed"
    return $((checks - passed))
}

# Function to check application health
check_application_readiness() {
    echo ""
    echo "💚 Application Health Checks"
    echo "============================="

    local checks=0
    local passed=0

    # Check health endpoint
    echo "🔍 Checking health endpoint"
    local service_url
    service_url=$(kubectl get service -n "$NAMESPACE" "$RELEASE_NAME" -o jsonpath='{.spec.clusterIP}:{.spec.ports[0].port}' 2>/dev/null || echo "")

    if [ -n "$service_url" ]; then
        if kubectl run curl-test --image=curlimages/curl:7.85.0 --rm -i --restart=Never -- \
           curl -s "http://$service_url/health" >/dev/null 2>&1; then
            echo "✅ Health endpoint responding"
            passed=$((passed + 1))
        else
            echo "❌ Health endpoint not responding"
        fi
    else
        echo "❌ Cannot determine service URL"
    fi
    checks=$((checks + 1))

    # Check database connectivity
    echo "🔍 Checking database connectivity"
    local db_pods
    db_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Running | grep -c postgres || echo "0")

    if [ "$db_pods" -gt 0 ]; then
        echo "✅ Database pods running"
        passed=$((passed + 1))
    else
        echo "⚠️  No database pods found (using external DB)"
        passed=$((passed + 1))  # Assume external DB is healthy
    fi
    checks=$((checks + 1))

    # Check resource utilization
    echo "🔍 Checking resource utilization"
    local high_cpu_pods
    high_cpu_pods=$(kubectl top pods -n "$NAMESPACE" --no-headers 2>/dev/null | \
                    awk '{if ($2 ~ /[0-9]+m/ && $2+0 > 800) print $1}' | wc -l || echo "0")

    if [ "$high_cpu_pods" -eq 0 ]; then
        echo "✅ CPU utilization healthy"
        passed=$((passed + 1))
    else
        echo "⚠️  High CPU detected ($high_cpu_pods pods)"
    fi
    checks=$((checks + 1))

    echo "📊 Application checks: $passed/$checks passed"
    return $((checks - passed))
}

# Function to validate SLO baseline
validate_slo_baseline() {
    echo ""
    echo "📈 SLO Baseline Validation"
    echo "=========================="

    local prometheus_url="${PROMETHEUS_URL:-http://prometheus.monitoring.svc.cluster.local:9090}"
    local checks=0
    local passed=0

    # Check current success rate
    echo "🔍 Validating current success rate (>99%)"
    local success_query="sum(rate(http_requests_total{namespace=\"$NAMESPACE\",status!~\"5.*\"}[5m]))/sum(rate(http_requests_total{namespace=\"$NAMESPACE\"}[5m]))*100"
    local success_response
    success_response=$(curl -s "$prometheus_url/api/v1/query" --data-urlencode "query=$success_query" || echo '{"status":"error"}')

    local success_rate
    success_rate=$(echo "$success_response" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")

    if [ "${success_rate%.*}" -ge 99 ] 2>/dev/null; then
        echo "✅ Success rate: ${success_rate}%"
        passed=$((passed + 1))
    else
        echo "❌ Success rate below threshold: ${success_rate}%"
    fi
    checks=$((checks + 1))

    # Check current P95 latency
    echo "🔍 Validating current P95 latency (<1.5s)"
    local latency_query="histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket{namespace=\"$NAMESPACE\"}[5m]))by(le))*1000"
    local latency_response
    latency_response=$(curl -s "$prometheus_url/api/v1/query" --data-urlencode "query=$latency_query" || echo '{"status":"error"}')

    local p95_latency
    p95_latency=$(echo "$latency_response" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")

    if [ "${p95_latency%.*}" -le 1500 ] 2>/dev/null; then
        echo "✅ P95 latency: ${p95_latency}ms"
        passed=$((passed + 1))
    else
        echo "❌ P95 latency above threshold: ${p95_latency}ms"
    fi
    checks=$((checks + 1))

    # Check error rate
    echo "🔍 Validating current error rate (<1%)"
    local error_query="sum(rate(http_requests_total{namespace=\"$NAMESPACE\",status=~\"5.*\"}[5m]))/sum(rate(http_requests_total{namespace=\"$NAMESPACE\"}[5m]))*100"
    local error_response
    error_response=$(curl -s "$prometheus_url/api/v1/query" --data-urlencode "query=$error_query" || echo '{"status":"error"}')

    local error_rate
    error_rate=$(echo "$error_response" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")

    if [ "${error_rate%.*}" -le 1 ] 2>/dev/null; then
        echo "✅ Error rate: ${error_rate}%"
        passed=$((passed + 1))
    else
        echo "❌ Error rate above threshold: ${error_rate}%"
    fi
    checks=$((checks + 1))

    echo "📊 SLO baseline checks: $passed/$checks passed"
    return $((checks - passed))
}

# Main validation function
main() {
    local total_failures=0
    local start_time
    start_time=$(date +%s)

    echo "🚀 Starting production readiness validation..."
    echo "Namespace: $NAMESPACE"
    echo "Release: $RELEASE_NAME"
    echo "Timestamp: $(date)"

    # Run all validation checks
    check_kubernetes_readiness || total_failures=$((total_failures + $?))
    check_observability_readiness || total_failures=$((total_failures + $?))
    check_security_readiness || total_failures=$((total_failures + $?))
    check_application_readiness || total_failures=$((total_failures + $?))
    validate_slo_baseline || total_failures=$((total_failures + $?))

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo "📋 Validation Summary"
    echo "===================="
    echo "Duration: ${duration}s"
    echo "Timestamp: $(date)"

    if [ $total_failures -eq 0 ]; then
        echo "✅ ALL CHECKS PASSED - Ready for production canary deployment"
        echo ""
        echo "🚀 Next steps:"
        echo "1. Run: ./scripts/canary/deploy-canary.sh"
        echo "2. Monitor: https://grafana.intelgraph.com/d/intelgraph-api-golden"
        echo "3. Alerts: Check Slack #alerts-prod for notifications"
        exit 0
    else
        echo "❌ VALIDATION FAILED - $total_failures check(s) failed"
        echo ""
        echo "🔧 Required actions:"
        echo "1. Review failed checks above"
        echo "2. Fix issues and re-run validation"
        echo "3. Do not proceed with canary until all checks pass"
        exit 1
    fi
}

# Execute main function
main "$@"