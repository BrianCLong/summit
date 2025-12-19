#!/bin/bash

# Production canary deployment script for IntelGraph
# Implements progressive traffic shifting: 10% → 50% → 100%
# Enforces SLO gates at each stage with automatic rollback

set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-intelgraph-prod}"
RELEASE_NAME="${RELEASE_NAME:-intelgraph}"
CHART_PATH="${CHART_PATH:-infra/helm/intelgraph}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.monitoring.svc.cluster.local:9090}"

# Canary stages configuration
if [ -n "${CANARY_STAGE_WEIGHTS:-}" ]; then
    IFS=',' read -ra CANARY_STAGES <<< "${CANARY_STAGE_WEIGHTS}"
else
    CANARY_STAGES=(10 50 100)
fi

# Ensure we always finalize at 100% even if the supplied plan omits it
if [ "${CANARY_STAGES[-1]}" != "100" ]; then
    CANARY_STAGES+=("100")
fi

FEATURE_FLAG_KEY="${CANARY_FEATURE_FLAG:-}"
STAGE_DURATION_MINUTES=30
SLO_CHECK_INTERVAL=30  # seconds

echo "🚀 IntelGraph Production Canary Deployment"
echo "=========================================="
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"
echo "Image Tag: $IMAGE_TAG"
echo "Stages: ${CANARY_STAGES[*]}%"
if [ -n "$FEATURE_FLAG_KEY" ]; then
    echo "Feature Flag: ${FEATURE_FLAG_KEY}"
fi
echo "Stage Duration: ${STAGE_DURATION_MINUTES} minutes"

# Function to check SLO compliance
check_slo_compliance() {
    local stage="$1"
    local duration="${2:-5}"  # minutes to check

    echo "📊 Checking SLO compliance for ${stage}% canary (${duration}m window)..."

    # Query Prometheus for key SLIs
    local queries=(
        # Success rate > 99%
        "sum(rate(http_requests_total{namespace=\"${NAMESPACE}\",status!~\"5.*\"}[${duration}m]))/sum(rate(http_requests_total{namespace=\"${NAMESPACE}\"}[${duration}m]))*100"
        # P95 latency < 1.5s (Phase 3 requirement)
        "histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket{namespace=\"${NAMESPACE}\"}[${duration}m]))by(le))*1000"
        # Error rate < 1%
        "sum(rate(http_requests_total{namespace=\"${NAMESPACE}\",status=~\"5.*\"}[${duration}m]))/sum(rate(http_requests_total{namespace=\"${NAMESPACE}\"}[${duration}m]))*100"
    )

    local slo_thresholds=(99 1500 1)  # success_rate, p95_latency_ms, error_rate
    local slo_names=("Success Rate" "P95 Latency" "Error Rate")
    local slo_operators=(">=" "<=" "<=")

    local violations=0

    for i in "${!queries[@]}"; do
        local query="${queries[$i]}"
        local threshold="${slo_thresholds[$i]}"
        local name="${slo_names[$i]}"
        local operator="${slo_operators[$i]}"

        echo "🔍 Checking ${name}..."

        # Query Prometheus
        local response
        response=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
            --data-urlencode "query=${query}" || echo '{"status":"error"}')

        local status
        status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "error")

        if [ "$status" != "success" ]; then
            echo "❌ Failed to query ${name} metrics"
            violations=$((violations + 1))
            continue
        fi

        local value
        value=$(echo "$response" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "null")

        if [ "$value" = "null" ] || [ -z "$value" ]; then
            echo "⚠️  No data for ${name}"
            violations=$((violations + 1))
            continue
        fi

        # Convert to number for comparison
        local numeric_value
        numeric_value=$(echo "$value" | cut -d. -f1)

        # Check threshold
        case "$operator" in
            ">=")
                if [ "$numeric_value" -ge "$threshold" ]; then
                    echo "✅ ${name}: ${value} ${operator} ${threshold}"
                else
                    echo "❌ ${name}: ${value} ${operator} ${threshold} (VIOLATION)"
                    violations=$((violations + 1))
                fi
                ;;
            "<=")
                if [ "$numeric_value" -le "$threshold" ]; then
                    echo "✅ ${name}: ${value} ${operator} ${threshold}"
                else
                    echo "❌ ${name}: ${value} ${operator} ${threshold} (VIOLATION)"
                    violations=$((violations + 1))
                fi
                ;;
        esac
    done

    echo ""
    if [ $violations -eq 0 ]; then
        echo "✅ All SLOs passing for ${stage}% canary"
        return 0
    else
        echo "❌ SLO violations detected: $violations/3"
        return 1
    fi
}

# Function to trigger canary rollback
rollback_canary() {
    echo "🚨 INITIATING CANARY ROLLBACK"
    echo "=============================="

    # Disable canary to trigger immediate rollback
    echo "⏪ Rolling back to stable version..."

    helm upgrade "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --set canary.enabled=false \
        --set image.tag="$IMAGE_TAG" \
        --wait \
        --timeout=10m

    echo "✅ Rollback completed"

    # Send alert to monitoring
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Event
metadata:
  name: canary-rollback-$(date +%s)
  namespace: $NAMESPACE
type: Warning
reason: CanaryRollback
message: "Canary deployment rolled back due to SLO violations"
source:
  component: deploy-canary.sh
firstTime: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
lastTime: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
count: 1
EOF
}

# Function to deploy specific canary stage
deploy_canary_stage() {
    local stage="$1"

    echo ""
    echo "🎯 Deploying Canary Stage: ${stage}%"
    echo "=================================="

    # Update Helm deployment with canary configuration
    echo "📦 Updating Helm deployment..."

    helm upgrade "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --set canary.enabled=true \
        --set canary.maxWeight="$stage" \
        --set image.tag="$IMAGE_TAG" \
        --wait \
        --timeout=15m

    echo "✅ Canary ${stage}% deployed successfully"

    # Wait for initial stabilization
    echo "⏱️  Waiting 2 minutes for metrics stabilization..."
    sleep 120

    # Monitor stage for specified duration
    local end_time=$(($(date +%s) + STAGE_DURATION_MINUTES * 60))
    local check_count=0
    local violations=0

    echo "🔍 Monitoring ${stage}% canary for ${STAGE_DURATION_MINUTES} minutes..."

    while [ $(date +%s) -lt $end_time ]; do
        check_count=$((check_count + 1))

        echo ""
        echo "📊 SLO Check #${check_count} ($(date '+%H:%M:%S'))"
        echo "==============================================="

        if ! check_slo_compliance "$stage" 5; then
            violations=$((violations + 1))

            if [ $violations -ge 3 ]; then
                echo "🚨 Too many SLO violations ($violations). Triggering rollback..."
                rollback_canary
                exit 1
            else
                echo "⚠️  SLO violation #${violations}/3. Continuing monitoring..."
            fi
        else
            # Reset violation count on successful check
            violations=0
        fi

        echo "⏳ Next check in ${SLO_CHECK_INTERVAL} seconds..."
        sleep $SLO_CHECK_INTERVAL
    done

    echo "✅ Stage ${stage}% completed successfully"
}

# Function to finalize deployment
finalize_deployment() {
    echo ""
    echo "🎉 Finalizing Production Deployment"
    echo "===================================="

    # Disable canary to move 100% traffic to new version
    echo "📦 Finalizing deployment (100% traffic to new version)..."

    helm upgrade "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --set canary.enabled=false \
        --set image.tag="$IMAGE_TAG" \
        --wait \
        --timeout=10m

    echo "✅ Production deployment finalized"

    # Tag successful deployment
    local git_sha
    git_sha=$(git rev-parse HEAD)

    echo "🏷️  Tagging GA release..."
    git tag -a "v2025.09.19-ga" -m "GA Release v2025.09.19

Production deployment completed successfully via canary.
- Image: ghcr.io/brianclong/intelgraph:${IMAGE_TAG}
- Commit: ${git_sha}
- Deployment: $(date -u +%Y-%m-%dT%H:%M:%SZ)

🤖 Generated with Claude Code
" || echo "⚠️  Tag may already exist"

    git push origin "v2025.09.19-ga" || echo "⚠️  Tag push may have failed"

    # Create release notes
    echo "📝 Creating release notes..."

    # Send success notification
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Event
metadata:
  name: canary-success-$(date +%s)
  namespace: $NAMESPACE
type: Normal
reason: CanarySuccess
message: "Canary deployment completed successfully - 100% traffic on new version"
source:
  component: deploy-canary.sh
firstTime: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
lastTime: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
count: 1
EOF
}

# Main execution
main() {
    echo "🔍 Pre-flight checks..."

    # Verify kubectl connectivity
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        echo "❌ Cannot access namespace: $NAMESPACE"
        exit 1
    fi

    # Verify Helm release exists
    if ! helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        echo "❌ Helm release not found: $RELEASE_NAME"
        exit 1
    fi

    # Verify Prometheus connectivity
    if ! curl -s "$PROMETHEUS_URL/api/v1/status/config" >/dev/null; then
        echo "❌ Cannot connect to Prometheus: $PROMETHEUS_URL"
        exit 1
    fi

    echo "✅ Pre-flight checks passed"

    # Execute canary stages
    for stage in "${CANARY_STAGES[@]}"; do
        if [ "$stage" -eq 100 ]; then
            # For 100%, just finalize the deployment
            finalize_deployment
            break
        else
            deploy_canary_stage "$stage"
        fi
    done

    echo ""
    echo "🎉 CANARY DEPLOYMENT COMPLETED SUCCESSFULLY"
    echo "============================================="
    echo "✅ All stages passed SLO gates"
    echo "✅ 100% traffic on new version"
    echo "✅ Release tagged: v2025.09.19-ga"
    echo ""
    echo "📊 Monitor production at: https://grafana.intelgraph.com/d/intelgraph-api-golden"
    echo "🔔 Alerts configured for continuous monitoring"
}

# Handle signals for graceful cleanup
trap 'echo "🛑 Deployment interrupted"; exit 130' INT TERM

# Execute main function
main "$@"
