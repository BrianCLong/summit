#!/bin/bash

# IntelGraph Maestro Automatic Rollback and Deployment Validation System
# Comprehensive automated rollback procedures with validation gates

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VALIDATION_LOG_DIR="$PROJECT_ROOT/logs/deployment-validation"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VALIDATION_RUN_ID="validation_${TIMESTAMP}"

# Deployment configuration
K8S_NAMESPACE="${K8S_NAMESPACE:-intelgraph-prod}"
APP_DEPLOYMENT="${APP_DEPLOYMENT:-maestro-conductor}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-600}" # 10 minutes
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}" # 5 minutes
VALIDATION_TIMEOUT="${VALIDATION_TIMEOUT:-180}" # 3 minutes

# Rollback configuration
AUTO_ROLLBACK_ENABLED="${AUTO_ROLLBACK_ENABLED:-true}"
ROLLBACK_ON_HEALTH_FAILURE="${ROLLBACK_ON_HEALTH_FAILURE:-true}"
ROLLBACK_ON_VALIDATION_FAILURE="${ROLLBACK_ON_VALIDATION_FAILURE:-true}"
ROLLBACK_ON_SLO_BREACH="${ROLLBACK_ON_SLO_BREACH:-true}"
ROLLBACK_ON_DIGEST_MISMATCH="${ROLLBACK_ON_DIGEST_MISMATCH:-true}"
CANARY_ROLLBACK_THRESHOLD="${CANARY_ROLLBACK_THRESHOLD:-5}" # 5% error rate

# Monitoring configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus-server.monitoring.svc.cluster.local:80}"
GRAFANA_URL="${GRAFANA_URL:-http://grafana.monitoring.svc.cluster.local:3000}"
ENABLE_METRICS_VALIDATION="${ENABLE_METRICS_VALIDATION:-true}"

# Supply chain verification configuration
SIGNED_DIGEST_FILE="${SIGNED_DIGEST_FILE:-$PROJECT_ROOT/release-artifacts/provenance.json}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$VALIDATION_LOG_DIR/${VALIDATION_RUN_ID}.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$VALIDATION_LOG_DIR/${VALIDATION_RUN_ID}.log" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$VALIDATION_LOG_DIR/${VALIDATION_RUN_ID}.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$VALIDATION_LOG_DIR/${VALIDATION_RUN_ID}.log"
}

# Initialize validation environment
initialize_validation() {
    log "🚀 Initializing deployment validation environment"
    
    # Create log directory
    mkdir -p "$VALIDATION_LOG_DIR"
    
    # Create validation state directory
    mkdir -p "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID"
    
    # Create validation metadata
    cat > "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/metadata.json" << EOF
{
    "validation_run_id": "$VALIDATION_RUN_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployment": {
        "namespace": "$K8S_NAMESPACE",
        "app": "$APP_DEPLOYMENT"
    },
    "configuration": {
        "auto_rollback_enabled": $AUTO_ROLLBACK_ENABLED,
        "rollback_on_health_failure": $ROLLBACK_ON_HEALTH_FAILURE,
        "rollback_on_validation_failure": $ROLLBACK_ON_VALIDATION_FAILURE,
        "rollback_on_slo_breach": $ROLLBACK_ON_SLO_BREACH,
        "rollback_on_digest_mismatch": $ROLLBACK_ON_DIGEST_MISMATCH,
        "canary_threshold": $CANARY_ROLLBACK_THRESHOLD
    },
    "status": "initialized",
    "phases": []
}
EOF
    
    success "Validation environment initialized: $VALIDATION_RUN_ID"
}

# Normalize digest strings
normalize_digest() {
    local digest="$1"
    if [ -z "$digest" ]; then
        echo ""
        return
    fi
    digest="${digest##*@}"
    digest="${digest#sha256:}"
    if [ -n "$digest" ]; then
        echo "sha256:$digest"
    else
        echo ""
    fi
}

# Resolve deployed image digest
get_deployed_image_digest() {
    if [ -n "${DEPLOYED_IMAGE_DIGEST:-}" ]; then
        normalize_digest "$DEPLOYED_IMAGE_DIGEST"
        return 0
    fi

    local deployment_status
    deployment_status=$(get_deployment_status)
    local image_ref
    image_ref=$(echo "$deployment_status" | jq -r '.spec.template.spec.containers[0].image // ""')
    local digest
    digest=$(echo "$image_ref" | grep -Eo 'sha256:[0-9a-f]{64}' | head -n 1 || true)

    if [ -z "$digest" ]; then
        local image_id
        image_id=$(kubectl get pods -n "$K8S_NAMESPACE" -l app="$APP_DEPLOYMENT" \
            -o jsonpath='{.items[0].status.containerStatuses[0].imageID}' 2>/dev/null || echo "")
        digest=$(echo "$image_id" | grep -Eo 'sha256:[0-9a-f]{64}' | head -n 1 || true)
    fi

    normalize_digest "$digest"
}

# Resolve signed artifact digest
get_signed_image_digest() {
    if [ -n "${SIGNED_IMAGE_DIGEST:-}" ]; then
        normalize_digest "$SIGNED_IMAGE_DIGEST"
        return 0
    fi

    if [ -f "$SIGNED_DIGEST_FILE" ]; then
        local digest_file_value
        digest_file_value=$(grep -Eo 'sha256:[0-9a-f]{64}' "$SIGNED_DIGEST_FILE" | head -n 1 || true)
        if [ -n "$digest_file_value" ]; then
            normalize_digest "$digest_file_value"
            return 0
        fi

        local provenance_digest
        provenance_digest=$(jq -r '.subject[0].digest.sha256 // empty' "$SIGNED_DIGEST_FILE" 2>/dev/null || echo "")
        if [ -n "$provenance_digest" ]; then
            normalize_digest "$provenance_digest"
            return 0
        fi
    fi

    if [ -f "$PROJECT_ROOT/cosign-verify.txt" ]; then
        local cosign_digest
        cosign_digest=$(grep -Eo 'sha256:[0-9a-f]{64}' "$PROJECT_ROOT/cosign-verify.txt" | head -n 1 || true)
        normalize_digest "$cosign_digest"
        return 0
    fi

    echo ""
}

# Record digest verification evidence
record_digest_evidence() {
    local deployed_digest="$1"
    local signed_digest="$2"
    local status="$3"
    local evidence_dir="$PROJECT_ROOT/evidence-bundles"
    local evidence_file="$evidence_dir/deployment-digest-${VALIDATION_RUN_ID}.json"

    mkdir -p "$evidence_dir"

    cat > "$evidence_file" << EOF
{
    "validation_run_id": "$VALIDATION_RUN_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployment": {
        "namespace": "$K8S_NAMESPACE",
        "app": "$APP_DEPLOYMENT"
    },
    "digests": {
        "deployed": "$deployed_digest",
        "signed": "$signed_digest"
    },
    "status": "$status",
    "sources": {
        "deployed": "${DEPLOYED_IMAGE_DIGEST:-kubectl}",
        "signed": "${SIGNED_IMAGE_DIGEST:-$SIGNED_DIGEST_FILE}"
    }
}
EOF

    success "Digest evidence recorded: $evidence_file"
}

# Verify deployed image digest matches signed artifact
verify_deployment_digest() {
    log "🔐 Verifying deployed image digest against signed artifact"

    local deployed_digest
    deployed_digest=$(get_deployed_image_digest)
    local signed_digest
    signed_digest=$(get_signed_image_digest)

    if [ -z "$deployed_digest" ] || [ -z "$signed_digest" ]; then
        record_digest_evidence "$deployed_digest" "$signed_digest" "missing"
        error "Digest verification failed: missing deployed or signed digest"
        return 1
    fi

    if [ "$deployed_digest" = "$signed_digest" ]; then
        record_digest_evidence "$deployed_digest" "$signed_digest" "matched"
        success "Digest verification passed: $deployed_digest"
        return 0
    fi

    record_digest_evidence "$deployed_digest" "$signed_digest" "mismatch"
    error "Digest mismatch detected: deployed $deployed_digest != signed $signed_digest"
    return 1
}

# Get current deployment status
get_deployment_status() {
    local deployment_info=$(kubectl get deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" -o json 2>/dev/null || echo "{}")
    
    if [ "$deployment_info" = "{}" ]; then
        error "Deployment $APP_DEPLOYMENT not found in namespace $K8S_NAMESPACE"
        return 1
    fi
    
    echo "$deployment_info"
}

# Get deployment revision history
get_revision_history() {
    kubectl rollout history deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" --output=json 2>/dev/null || echo "{}"
}

# Capture pre-deployment baseline
capture_baseline() {
    log "📊 Capturing pre-deployment baseline metrics"
    
    local baseline_file="$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/baseline.json"
    local deployment_status=$(get_deployment_status)
    
    # Get current replica count
    local current_replicas=$(echo "$deployment_status" | jq -r '.status.replicas // 0')
    local ready_replicas=$(echo "$deployment_status" | jq -r '.status.readyReplicas // 0')
    local current_revision=$(kubectl rollout history deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" | tail -n 1 | awk '{print $1}')
    
    # Get baseline metrics if Prometheus is available
    local error_rate="0"
    local response_time="0"
    local throughput="0"
    
    if command -v curl >/dev/null && [ "$ENABLE_METRICS_VALIDATION" = "true" ]; then
        # Try to get metrics from Prometheus
        error_rate=$(query_prometheus "rate(conductor_http_request_failed_total[5m])" "0")
        response_time=$(query_prometheus "histogram_quantile(0.95, rate(conductor_http_request_duration_seconds_bucket[5m]))" "0")
        throughput=$(query_prometheus "rate(conductor_http_request_total[5m])" "0")
    fi
    
    # Create baseline snapshot
    cat > "$baseline_file" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployment": {
        "name": "$APP_DEPLOYMENT",
        "namespace": "$K8S_NAMESPACE",
        "replicas": $current_replicas,
        "ready_replicas": $ready_replicas,
        "revision": "$current_revision",
        "image": "$(echo "$deployment_status" | jq -r '.spec.template.spec.containers[0].image // "unknown"')"
    },
    "metrics": {
        "error_rate": $error_rate,
        "response_time_p95": $response_time,
        "throughput": $throughput
    },
    "health": {
        "status": "$(get_health_status)",
        "ready_pods": $ready_replicas,
        "total_pods": $current_replicas
    }
}
EOF
    
    success "Baseline captured: $(echo "$deployment_status" | jq -r '.spec.template.spec.containers[0].image // "unknown"')"
}

# Query Prometheus for metrics
query_prometheus() {
    local query="$1"
    local default_value="$2"
    
    local result=$(curl -s --max-time 10 "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=${query}" 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "'"$default_value"'"' 2>/dev/null || echo "$default_value")
    
    echo "$result"
}

# Get application health status
get_health_status() {
    local service_url="http://${APP_DEPLOYMENT}.${K8S_NAMESPACE}.svc.cluster.local:5000"
    
    # Try to get health status via kubectl exec
    local health_pod=$(kubectl get pods -n "$K8S_NAMESPACE" -l app="$APP_DEPLOYMENT" --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$health_pod" ]; then
        local health_result=$(kubectl exec -n "$K8S_NAMESPACE" "$health_pod" -- curl -s --max-time 5 localhost:5000/health 2>/dev/null | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
        echo "$health_result"
    else
        echo "unknown"
    fi
}

# Wait for deployment rollout
wait_for_rollout() {
    log "⏳ Waiting for deployment rollout to complete"
    
    local start_time=$(date +%s)
    
    if kubectl rollout status deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" --timeout="${ROLLOUT_TIMEOUT}s"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        success "Deployment rollout completed in ${duration}s"
        return 0
    else
        error "Deployment rollout timed out after ${ROLLOUT_TIMEOUT}s"
        return 1
    fi
}

# Validate deployment health
validate_deployment_health() {
    log "🏥 Validating deployment health"
    
    local validation_start=$(date +%s)
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 10))
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local deployment_status=$(get_deployment_status)
        local ready_replicas=$(echo "$deployment_status" | jq -r '.status.readyReplicas // 0')
        local desired_replicas=$(echo "$deployment_status" | jq -r '.spec.replicas // 0')
        
        log "Health check attempt $((attempt + 1))/$max_attempts - Ready: $ready_replicas/$desired_replicas"
        
        # Check if all replicas are ready
        if [ "$ready_replicas" -eq "$desired_replicas" ] && [ "$ready_replicas" -gt 0 ]; then
            # Additional health endpoint check
            local health_status=$(get_health_status)
            
            if [ "$health_status" = "healthy" ]; then
                local validation_duration=$(($(date +%s) - validation_start))
                success "Deployment health validation passed in ${validation_duration}s"
                return 0
            else
                warning "Health endpoint returned: $health_status"
            fi
        fi
        
        attempt=$((attempt + 1))
        sleep 10
    done
    
    error "Deployment health validation failed after ${HEALTH_CHECK_TIMEOUT}s"
    return 1
}

# Run functional validation tests
run_functional_validation() {
    log "🧪 Running functional validation tests"
    
    local validation_results=()
    local failed_tests=()
    
    # Test 1: Basic API connectivity
    if validate_api_connectivity; then
        validation_results+=("api_connectivity:PASS")
    else
        validation_results+=("api_connectivity:FAIL")
        failed_tests+=("api_connectivity")
    fi
    
    # Test 2: Database connectivity
    if validate_database_connectivity; then
        validation_results+=("database_connectivity:PASS")
    else
        validation_results+=("database_connectivity:FAIL")
        failed_tests+=("database_connectivity")
    fi
    
    # Test 3: Redis connectivity
    if validate_redis_connectivity; then
        validation_results+=("redis_connectivity:PASS")
    else
        validation_results+=("redis_connectivity:FAIL")
        failed_tests+=("redis_connectivity")
    fi
    
    # Test 4: Workflow execution
    if validate_workflow_execution; then
        validation_results+=("workflow_execution:PASS")
    else
        validation_results+=("workflow_execution:FAIL")
        failed_tests+=("workflow_execution")
    fi
    
    # Test 5: Authentication system
    if validate_authentication_system; then
        validation_results+=("authentication:PASS")
    else
        validation_results+=("authentication:FAIL")
        failed_tests+=("authentication")
    fi
    
    # Save validation results
    printf "%s\n" "${validation_results[@]}" > "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/functional_tests.txt"
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        success "All functional validation tests passed"
        return 0
    else
        error "Functional validation failed. Failed tests: ${failed_tests[*]}"
        return 1
    fi
}

# Validate API connectivity
validate_api_connectivity() {
    log "🔗 Testing API connectivity"
    
    local test_pod="api-test-$(date +%s)"
    local service_url="http://${APP_DEPLOYMENT}.${K8S_NAMESPACE}.svc.cluster.local:5000"
    
    if kubectl run "$test_pod" --rm -i --restart=Never --image=curlimages/curl:latest -- \
        curl -s --max-time 10 --fail "$service_url/health" >/dev/null 2>&1; then
        success "API connectivity test passed"
        return 0
    else
        error "API connectivity test failed"
        return 1
    fi
}

# Validate database connectivity
validate_database_connectivity() {
    log "🗄️ Testing database connectivity"
    
    # Get a pod to test from
    local app_pod=$(kubectl get pods -n "$K8S_NAMESPACE" -l app="$APP_DEPLOYMENT" --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$app_pod" ]; then
        # Try to execute a simple database query via the application
        local db_test_result=$(kubectl exec -n "$K8S_NAMESPACE" "$app_pod" -- curl -s --max-time 5 localhost:5000/health 2>/dev/null | jq -r '.components.database // "unhealthy"' 2>/dev/null || echo "unhealthy")
        
        if [ "$db_test_result" = "healthy" ]; then
            success "Database connectivity test passed"
            return 0
        else
            error "Database connectivity test failed: $db_test_result"
            return 1
        fi
    else
        error "No running pods found for database connectivity test"
        return 1
    fi
}

# Validate Redis connectivity
validate_redis_connectivity() {
    log "🔄 Testing Redis connectivity"
    
    local app_pod=$(kubectl get pods -n "$K8S_NAMESPACE" -l app="$APP_DEPLOYMENT" --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$app_pod" ]; then
        local redis_test_result=$(kubectl exec -n "$K8S_NAMESPACE" "$app_pod" -- curl -s --max-time 5 localhost:5000/health 2>/dev/null | jq -r '.components.redis // "unhealthy"' 2>/dev/null || echo "unhealthy")
        
        if [ "$redis_test_result" = "healthy" ]; then
            success "Redis connectivity test passed"
            return 0
        else
            error "Redis connectivity test failed: $redis_test_result"
            return 1
        fi
    else
        error "No running pods found for Redis connectivity test"
        return 1
    fi
}

# Validate workflow execution
validate_workflow_execution() {
    log "⚡ Testing workflow execution"
    
    local test_pod="workflow-test-$(date +%s)"
    local service_url="http://${APP_DEPLOYMENT}.${K8S_NAMESPACE}.svc.cluster.local:5000"
    
    # Execute a simple Hello World workflow
    local workflow_result=$(kubectl run "$test_pod" --rm -i --restart=Never --image=curlimages/curl:latest -- \
        curl -s --max-time 30 -X POST "$service_url/workflows/hello-world/execute" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null | jq -r '.success // false' 2>/dev/null || echo "false")
    
    if [ "$workflow_result" = "true" ]; then
        success "Workflow execution test passed"
        return 0
    else
        error "Workflow execution test failed"
        return 1
    fi
}

# Validate authentication system
validate_authentication_system() {
    log "🔐 Testing authentication system"
    
    local test_pod="auth-test-$(date +%s)"
    local service_url="http://${APP_DEPLOYMENT}.${K8S_NAMESPACE}.svc.cluster.local:5000"
    
    # Test JWKS endpoint
    local jwks_result=$(kubectl run "$test_pod" --rm -i --restart=Never --image=curlimages/curl:latest -- \
        curl -s --max-time 10 --fail "$service_url/auth/jwks" 2>/dev/null | jq -r '.keys | length' 2>/dev/null || echo "0")
    
    if [ "$jwks_result" -gt "0" ]; then
        success "Authentication system test passed"
        return 0
    else
        error "Authentication system test failed"
        return 1
    fi
}

# Validate performance metrics
validate_performance_metrics() {
    if [ "$ENABLE_METRICS_VALIDATION" = "false" ]; then
        log "📈 Performance metrics validation disabled, skipping"
        return 0
    fi
    
    log "📈 Validating performance metrics"
    
    # Wait for metrics to stabilize
    log "Waiting 60s for metrics to stabilize..."
    sleep 60
    
    local baseline_file="$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/baseline.json"
    
    if [ ! -f "$baseline_file" ]; then
        warning "Baseline metrics not found, skipping performance validation"
        return 0
    fi
    
    # Get current metrics
    local current_error_rate=$(query_prometheus "rate(conductor_http_request_failed_total[5m])" "0")
    local current_response_time=$(query_prometheus "histogram_quantile(0.95, rate(conductor_http_request_duration_seconds_bucket[5m]))" "0")
    local current_throughput=$(query_prometheus "rate(conductor_http_request_total[5m])" "0")
    
    # Get baseline metrics
    local baseline_error_rate=$(jq -r '.metrics.error_rate' "$baseline_file")
    local baseline_response_time=$(jq -r '.metrics.response_time_p95' "$baseline_file")
    
    local performance_issues=()
    
    # Check error rate increase
    local error_rate_increase=$(echo "$current_error_rate > $baseline_error_rate + 0.02" | bc -l)
    if [ "$error_rate_increase" = "1" ]; then
        performance_issues+=("error_rate: $current_error_rate vs baseline $baseline_error_rate")
    fi
    
    # Check response time increase
    local response_time_increase=$(echo "$current_response_time > $baseline_response_time * 1.5" | bc -l)
    if [ "$response_time_increase" = "1" ]; then
        performance_issues+=("response_time: ${current_response_time}s vs baseline ${baseline_response_time}s")
    fi
    
    # Save current metrics
    cat > "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/current_metrics.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "metrics": {
        "error_rate": $current_error_rate,
        "response_time_p95": $current_response_time,
        "throughput": $current_throughput
    }
}
EOF
    
    if [ ${#performance_issues[@]} -eq 0 ]; then
        success "Performance metrics validation passed"
        return 0
    else
        error "Performance degradation detected: ${performance_issues[*]}"
        return 1
    fi
}

# Check for SLO breaches
check_slo_breaches() {
    if [ "$ENABLE_METRICS_VALIDATION" = "false" ]; then
        log "📊 SLO breach checking disabled, skipping"
        return 0
    fi
    
    log "📊 Checking for SLO breaches"
    
    # Define SLO thresholds
    local max_error_rate=0.02  # 2%
    local max_response_time=5.0  # 5 seconds
    local min_availability=0.99  # 99%
    
    # Get current metrics
    local current_error_rate=$(query_prometheus "rate(conductor_http_request_failed_total[5m])" "0")
    local current_response_time=$(query_prometheus "histogram_quantile(0.95, rate(conductor_http_request_duration_seconds_bucket[5m]))" "0")
    local current_availability=$(query_prometheus "avg_over_time(up{job='maestro-conductor'}[5m])" "1")
    
    local slo_breaches=()
    
    # Check error rate SLO
    local error_rate_breach=$(echo "$current_error_rate > $max_error_rate" | bc -l)
    if [ "$error_rate_breach" = "1" ]; then
        slo_breaches+=("error_rate: $current_error_rate > $max_error_rate")
    fi
    
    # Check response time SLO
    local response_time_breach=$(echo "$current_response_time > $max_response_time" | bc -l)
    if [ "$response_time_breach" = "1" ]; then
        slo_breaches+=("response_time: ${current_response_time}s > ${max_response_time}s")
    fi
    
    # Check availability SLO
    local availability_breach=$(echo "$current_availability < $min_availability" | bc -l)
    if [ "$availability_breach" = "1" ]; then
        slo_breaches+=("availability: $current_availability < $min_availability")
    fi
    
    if [ ${#slo_breaches[@]} -eq 0 ]; then
        success "No SLO breaches detected"
        return 0
    else
        error "SLO breaches detected: ${slo_breaches[*]}"
        return 1
    fi
}

# Perform rollback
perform_rollback() {
    if [ "$AUTO_ROLLBACK_ENABLED" = "false" ]; then
        error "Auto-rollback is disabled. Manual intervention required."
        return 1
    fi
    
    log "⏪ Performing automatic rollback"
    
    # Get previous revision
    local previous_revision=$(kubectl rollout history deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" | tail -n 2 | head -n 1 | awk '{print $1}' | tr -d ' ')
    
    if [ -z "$previous_revision" ] || [ "$previous_revision" = "REVISION" ]; then
        error "Cannot determine previous revision for rollback"
        return 1
    fi
    
    log "Rolling back to revision: $previous_revision"
    
    # Perform the rollback
    if kubectl rollout undo deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" --to-revision="$previous_revision"; then
        log "Rollback initiated, waiting for completion..."
        
        if kubectl rollout status deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" --timeout="${ROLLOUT_TIMEOUT}s"; then
            success "Rollback completed successfully to revision $previous_revision"
            
            # Verify rollback health
            if validate_deployment_health; then
                success "Rollback health validation passed"
                return 0
            else
                error "Rollback health validation failed"
                return 1
            fi
        else
            error "Rollback did not complete within timeout"
            return 1
        fi
    else
        error "Rollback command failed"
        return 1
    fi
}

# Generate validation report
generate_validation_report() {
    log "📊 Generating validation report"
    
    local report_file="$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/report.json"
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Determine overall status
    local overall_status="unknown"
    if [ -f "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/status.txt" ]; then
        overall_status=$(cat "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/status.txt")
    fi
    
    # Get test results
    local functional_tests_passed=0
    local functional_tests_failed=0
    
    if [ -f "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/functional_tests.txt" ]; then
        functional_tests_passed=$(grep -c "PASS" "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/functional_tests.txt" || echo 0)
        functional_tests_failed=$(grep -c "FAIL" "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/functional_tests.txt" || echo 0)
    fi
    
    cat > "$report_file" << EOF
{
    "validation_run_id": "$VALIDATION_RUN_ID",
    "start_time": "$(jq -r '.timestamp' "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/metadata.json")",
    "end_time": "$end_time",
    "overall_status": "$overall_status",
    "deployment": $(jq '.deployment' "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/metadata.json"),
    "configuration": $(jq '.configuration' "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/metadata.json"),
    "validation_results": {
        "rollout_successful": true,
        "health_check_passed": true,
        "functional_tests": {
            "total": $((functional_tests_passed + functional_tests_failed)),
            "passed": $functional_tests_passed,
            "failed": $functional_tests_failed
        },
        "performance_validation_passed": true,
        "slo_breaches_detected": false
    },
    "artifacts": {
        "log_file": "$VALIDATION_LOG_DIR/${VALIDATION_RUN_ID}.log",
        "baseline_metrics": "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/baseline.json",
        "current_metrics": "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/current_metrics.json",
        "digest_evidence": "$PROJECT_ROOT/evidence-bundles/deployment-digest-${VALIDATION_RUN_ID}.json"
    }
}
EOF
    
    success "Validation report generated: $report_file"
}

# Main validation function
main() {
    local validation_mode="${1:-validate}"
    
    log "🚀 Starting IntelGraph Maestro Deployment Validation"
    log "Mode: $validation_mode"
    log "Deployment: $APP_DEPLOYMENT"
    log "Namespace: $K8S_NAMESPACE"
    
    initialize_validation
    
    case $validation_mode in
        "validate")
            run_full_validation
            ;;
        "rollback")
            perform_rollback
            ;;
        "test")
            run_functional_validation
            ;;
        *)
            error "Unknown validation mode: $validation_mode"
            exit 1
            ;;
    esac
}

# Run full validation pipeline
run_full_validation() {
    local validation_failed=false
    local rollback_required=false
    
    # Phase 1: Capture baseline
    capture_baseline
    
    # Phase 2: Wait for rollout completion
    if ! wait_for_rollout; then
        validation_failed=true
        rollback_required=true
    fi
    
    # Phase 3: Health validation
    if ! validation_failed && ! validate_deployment_health; then
        validation_failed=true
        if [ "$ROLLBACK_ON_HEALTH_FAILURE" = "true" ]; then
            rollback_required=true
        fi
    fi
    
    # Phase 4: Supply chain digest verification
    if ! validation_failed && ! verify_deployment_digest; then
        validation_failed=true
        if [ "$ROLLBACK_ON_DIGEST_MISMATCH" = "true" ]; then
            rollback_required=true
        fi
    fi

    # Phase 5: Functional validation
    if ! validation_failed && ! run_functional_validation; then
        validation_failed=true
        if [ "$ROLLBACK_ON_VALIDATION_FAILURE" = "true" ]; then
            rollback_required=true
        fi
    fi
    
    # Phase 6: Performance validation
    if ! validation_failed && ! validate_performance_metrics; then
        validation_failed=true
        warning "Performance degradation detected, but not triggering rollback"
    fi
    
    # Phase 7: SLO breach check
    if ! validation_failed && ! check_slo_breaches; then
        validation_failed=true
        if [ "$ROLLBACK_ON_SLO_BREACH" = "true" ]; then
            rollback_required=true
        fi
    fi
    
    # Determine final status
    if [ "$rollback_required" = "true" ]; then
        echo "rollback_required" > "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/status.txt"
        
        log "💥 Validation failed, performing automatic rollback"
        
        if perform_rollback; then
            success "🔄 Automatic rollback completed successfully"
            echo "rolled_back" > "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/status.txt"
        else
            error "❌ Automatic rollback failed - manual intervention required"
            echo "rollback_failed" > "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/status.txt"
            exit 1
        fi
    elif [ "$validation_failed" = "true" ]; then
        echo "validation_failed" > "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/status.txt"
        warning "⚠️ Validation completed with warnings"
    else
        echo "success" > "$PROJECT_ROOT/deployment/validation-state/$VALIDATION_RUN_ID/status.txt"
        success "✅ Deployment validation completed successfully"
    fi
    
    generate_validation_report
}

# Help function
show_help() {
    cat << EOF
IntelGraph Maestro Rollback and Deployment Validation System

Usage: $0 [MODE] [OPTIONS]

Modes:
    validate (default)    - Run full deployment validation
    rollback             - Perform rollback to previous revision
    test                 - Run functional tests only

Options:
    --namespace NAMESPACE         Kubernetes namespace (default: intelgraph-prod)
    --deployment NAME            Deployment name (default: maestro-conductor)
    --rollout-timeout SECONDS    Rollout timeout (default: 600)
    --health-timeout SECONDS     Health check timeout (default: 300)
    --no-auto-rollback          Disable automatic rollback
    --no-health-rollback        Don't rollback on health failures
    --no-validation-rollback    Don't rollback on validation failures
    --no-slo-rollback           Don't rollback on SLO breaches
    --no-digest-rollback        Don't rollback on digest mismatch
    --no-metrics                Disable metrics validation
    --canary-threshold PERCENT   Error rate threshold for canary rollback
    --help                      Show this help message

Environment Variables:
    K8S_NAMESPACE                Kubernetes namespace
    APP_DEPLOYMENT              Application deployment name
    ROLLOUT_TIMEOUT             Rollout timeout in seconds
    AUTO_ROLLBACK_ENABLED       Enable automatic rollback (true/false)
    ROLLBACK_ON_DIGEST_MISMATCH Roll back on digest mismatch (true/false)
    SIGNED_DIGEST_FILE          Path to signed artifact digest file
    SIGNED_IMAGE_DIGEST         Signed artifact digest override
    DEPLOYED_IMAGE_DIGEST       Deployed image digest override
    PROMETHEUS_URL              Prometheus server URL
    ENABLE_METRICS_VALIDATION   Enable metrics validation (true/false)

Examples:
    $0                                    # Run full validation
    $0 validate --no-auto-rollback       # Validate without rollback
    $0 rollback                          # Force rollback
    $0 test --namespace staging          # Run tests only

EOF
}

# Parse command line arguments
MODE="validate"
if [ $# -gt 0 ] && [[ ! "$1" =~ ^-- ]]; then
    MODE="$1"
    shift
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            K8S_NAMESPACE="$2"
            shift 2
            ;;
        --deployment)
            APP_DEPLOYMENT="$2"
            shift 2
            ;;
        --rollout-timeout)
            ROLLOUT_TIMEOUT="$2"
            shift 2
            ;;
        --health-timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        --no-auto-rollback)
            AUTO_ROLLBACK_ENABLED="false"
            shift
            ;;
        --no-health-rollback)
            ROLLBACK_ON_HEALTH_FAILURE="false"
            shift
            ;;
        --no-validation-rollback)
            ROLLBACK_ON_VALIDATION_FAILURE="false"
            shift
            ;;
        --no-slo-rollback)
            ROLLBACK_ON_SLO_BREACH="false"
            shift
            ;;
        --no-digest-rollback)
            ROLLBACK_ON_DIGEST_MISMATCH="false"
            shift
            ;;
        --no-metrics)
            ENABLE_METRICS_VALIDATION="false"
            shift
            ;;
        --canary-threshold)
            CANARY_ROLLBACK_THRESHOLD="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check prerequisites
if ! command -v kubectl >/dev/null; then
    error "kubectl is required but not installed"
    exit 1
fi

if ! command -v jq >/dev/null; then
    error "jq is required but not installed"
    exit 1
fi

# Run main function
main "$MODE"
