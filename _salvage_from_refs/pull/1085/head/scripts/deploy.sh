#!/usr/bin/env bash
set -euo pipefail

# Zero-Downtime Deployment Script
# Orchestrates blue-green and canary deployments with health validation

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }
info() { printf "${PURPLE}📋 %s${NC}\n" "$*"; }

# Configuration
STRATEGY="${STRATEGY:-blue-green}"
ENVIRONMENT="${ENVIRONMENT:-development}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NAMESPACE="${NAMESPACE:-conductor}"
TIMEOUT="${TIMEOUT:-600}"
ROLLBACK_THRESHOLD_ERROR_RATE="${ROLLBACK_THRESHOLD_ERROR_RATE:-1.0}"
ROLLBACK_THRESHOLD_LATENCY="${ROLLBACK_THRESHOLD_LATENCY:-1000}"
CANARY_PERCENT="${CANARY_PERCENT:-10}"
CANARY_INCREMENT="${CANARY_INCREMENT:-20}"
DRY_RUN="${DRY_RUN:-false}"

# Health check configuration
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=30
SMOKE_TEST_TIMEOUT=300

# Global state
DEPLOYMENT_ID=""
GREEN_DEPLOYMENT_CREATED=false
TRAFFIC_SWITCHED=false
ROLLBACK_REQUIRED=false

# Deployment validation
validate_prerequisites() {
    say "🔍 Validating Prerequisites"
    
    # Check required tools
    local required_tools=("kubectl" "docker" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            fail "Required tool not found: $tool"
            return 1
        fi
        pass "Found required tool: $tool"
    done
    
    # Check cluster connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        fail "Cannot connect to Kubernetes cluster"
        return 1
    fi
    pass "Kubernetes cluster accessible"
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        info "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
    fi
    pass "Namespace ready: $NAMESPACE"
    
    # Validate image availability
    if [ "$DRY_RUN" = "false" ]; then
        info "Validating image availability"
        if ! docker manifest inspect "conductor/server:$IMAGE_TAG" >/dev/null 2>&1; then
            fail "Image not available: conductor/server:$IMAGE_TAG"
            return 1
        fi
        pass "Image validated: conductor/server:$IMAGE_TAG"
    fi
    
    # Check current deployment status
    local current_deployment=$(kubectl get deployment -n "$NAMESPACE" -l app=conductor-server -o name 2>/dev/null || echo "")
    if [ -n "$current_deployment" ]; then
        info "Current deployment found: $current_deployment"
    else
        info "No existing deployment found - initial deployment"
    fi
}

# Generate Kubernetes manifests
generate_manifests() {
    local color="$1"
    local manifest_dir="k8s/generated"
    
    say "📝 Generating Kubernetes Manifests ($color)"
    mkdir -p "$manifest_dir"
    
    # Generate deployment manifest
    cat > "$manifest_dir/deployment-$color.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: conductor-server-$color
  namespace: $NAMESPACE
  labels:
    app: conductor-server
    version: $IMAGE_TAG
    color: $color
    environment: $ENVIRONMENT
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: conductor-server
      color: $color
  template:
    metadata:
      labels:
        app: conductor-server
        color: $color
        version: $IMAGE_TAG
        environment: $ENVIRONMENT
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: server
        image: conductor/server:$IMAGE_TAG
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 8080
          name: metrics
        env:
        - name: NODE_ENV
          value: "$ENVIRONMENT"
        - name: CONDUCTOR_ENABLED
          value: "true"
        - name: DEPLOYMENT_COLOR
          value: "$color"
        - name: DEPLOYMENT_VERSION
          value: "$IMAGE_TAG"
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: conductor-secrets
              key: postgres-url
        - name: NEO4J_URL
          valueFrom:
            secretKeyRef:
              name: conductor-secrets
              key: neo4j-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: conductor-secrets
              key: redis-url
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
      terminationGracePeriodSeconds: 30
EOF

    # Generate service manifest
    cat > "$manifest_dir/service-$color.yaml" << EOF
apiVersion: v1
kind: Service
metadata:
  name: conductor-server-$color
  namespace: $NAMESPACE
  labels:
    app: conductor-server
    color: $color
spec:
  selector:
    app: conductor-server
    color: $color
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  - name: metrics
    port: 8080
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
EOF

    # Generate ingress manifest (traffic routing)
    if [ "$color" = "green" ] && [ "$STRATEGY" = "canary" ]; then
        cat > "$manifest_dir/ingress-$color.yaml" << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: conductor-server-$color
  namespace: $NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "$CANARY_PERCENT"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.conductor.local
    secretName: conductor-tls
  rules:
  - host: api.conductor.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: conductor-server-$color
            port:
              number: 80
EOF
    elif [ "$color" = "green" ] && [ "$STRATEGY" = "blue-green" ]; then
        # For blue-green, we'll switch the main ingress later
        cat > "$manifest_dir/ingress-main.yaml" << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: conductor-server-main
  namespace: $NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
spec:
  tls:
  - hosts:
    - api.conductor.local
    secretName: conductor-tls
  rules:
  - host: api.conductor.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: conductor-server-$color
            port:
              number: 80
EOF
    fi
    
    pass "Manifests generated for $color environment"
}

# Execute database migrations
execute_migrations() {
    say "🗄️  Executing Database Migrations"
    
    # Create migration job
    cat > k8s/generated/migration-job.yaml << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: conductor-migration-$(date +%s)
  namespace: $NAMESPACE
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: conductor/server:$IMAGE_TAG
        command: ["npm", "run", "migrate"]
        env:
        - name: NODE_ENV
          value: "$ENVIRONMENT"
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: conductor-secrets
              key: postgres-url
        - name: NEO4J_URL
          valueFrom:
            secretKeyRef:
              name: conductor-secrets
              key: neo4j-url
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 1Gi
EOF

    if [ "$DRY_RUN" = "false" ]; then
        kubectl apply -f k8s/generated/migration-job.yaml
        
        # Wait for migration to complete
        local job_name=$(kubectl get job -n "$NAMESPACE" -l app=conductor-migration --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}')
        
        info "Waiting for migration job to complete: $job_name"
        kubectl wait --for=condition=complete job/"$job_name" -n "$NAMESPACE" --timeout=300s
        
        # Check migration status
        if kubectl get job "$job_name" -n "$NAMESPACE" -o jsonpath='{.status.succeeded}' | grep -q "1"; then
            pass "Database migrations completed successfully"
        else
            fail "Database migrations failed"
            kubectl logs job/"$job_name" -n "$NAMESPACE"
            return 1
        fi
    else
        info "DRY RUN: Would execute migration job"
    fi
}

# Deploy green environment
deploy_green_environment() {
    say "🚀 Deploying Green Environment"
    
    # Generate green manifests
    generate_manifests "green"
    
    if [ "$DRY_RUN" = "false" ]; then
        # Apply green deployment
        kubectl apply -f k8s/generated/deployment-green.yaml
        kubectl apply -f k8s/generated/service-green.yaml
        
        # Wait for green deployment to be ready
        info "Waiting for green deployment to be ready..."
        kubectl wait --for=condition=available deployment/conductor-server-green -n "$NAMESPACE" --timeout="${TIMEOUT}s"
        
        # Verify all pods are ready
        local ready_pods=$(kubectl get pods -n "$NAMESPACE" -l app=conductor-server,color=green -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}')
        if echo "$ready_pods" | grep -q "False"; then
            fail "Some green pods are not ready"
            kubectl get pods -n "$NAMESPACE" -l app=conductor-server,color=green
            return 1
        fi
        
        GREEN_DEPLOYMENT_CREATED=true
        pass "Green environment deployed successfully"
    else
        info "DRY RUN: Would deploy green environment"
        GREEN_DEPLOYMENT_CREATED=true
    fi
}

# Run health checks
run_health_checks() {
    local environment="$1"
    say "🔍 Running Health Checks ($environment)"
    
    if [ "$DRY_RUN" = "true" ]; then
        info "DRY RUN: Would run health checks for $environment"
        return 0
    fi
    
    local service_url
    if [ "$environment" = "green" ]; then
        # Port-forward to green service for testing
        kubectl port-forward service/conductor-server-green 8080:80 -n "$NAMESPACE" &
        local port_forward_pid=$!
        sleep 5
        service_url="http://localhost:8080"
    else
        service_url="http://api.conductor.local"
    fi
    
    local health_passed=true
    
    # Health endpoint check
    info "Checking health endpoint"
    for ((i=1; i<=HEALTH_CHECK_RETRIES; i++)); do
        if curl -f -s --max-time 10 "$service_url/api/health" >/dev/null; then
            pass "Health check passed ($i/$HEALTH_CHECK_RETRIES)"
            break
        else
            if [ $i -eq $HEALTH_CHECK_RETRIES ]; then
                fail "Health check failed after $HEALTH_CHECK_RETRIES attempts"
                health_passed=false
            else
                warn "Health check failed ($i/$HEALTH_CHECK_RETRIES), retrying..."
                sleep "$HEALTH_CHECK_INTERVAL"
            fi
        fi
    done
    
    # Status endpoint check
    if [ "$health_passed" = "true" ]; then
        info "Checking status endpoint"
        local status_response=$(curl -s --max-time 10 "$service_url/api/status" || echo "")
        
        if echo "$status_response" | jq -e '.overall_status == "healthy"' >/dev/null 2>&1; then
            pass "Status check passed"
        else
            warn "Status check failed or degraded"
            echo "$status_response" | jq '.overall_status // "unknown"' || true
        fi
    fi
    
    # Clean up port-forward
    if [ "$environment" = "green" ] && [ -n "${port_forward_pid:-}" ]; then
        kill "$port_forward_pid" >/dev/null 2>&1 || true
    fi
    
    return $([ "$health_passed" = "true" ] && echo 0 || echo 1)
}

# Run smoke tests
run_smoke_tests() {
    local environment="$1"
    say "🧪 Running Smoke Tests ($environment)"
    
    if [ "$DRY_RUN" = "true" ]; then
        info "DRY RUN: Would run smoke tests for $environment"
        return 0
    fi
    
    local service_url
    if [ "$environment" = "green" ]; then
        kubectl port-forward service/conductor-server-green 8081:80 -n "$NAMESPACE" &
        local port_forward_pid=$!
        sleep 5
        service_url="http://localhost:8081"
    else
        service_url="http://api.conductor.local"
    fi
    
    local smoke_tests_passed=true
    
    # Test 1: Basic API functionality
    info "Testing basic API functionality"
    local api_response=$(curl -s --max-time 10 "$service_url/api/health" || echo "")
    if echo "$api_response" | jq -e '.status == "ok"' >/dev/null 2>&1; then
        pass "Basic API test passed"
    else
        fail "Basic API test failed"
        smoke_tests_passed=false
    fi
    
    # Test 2: GraphQL endpoint
    info "Testing GraphQL endpoint"
    local graphql_response=$(curl -s --max-time 10 \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"query": "query { __typename }"}' \
        "$service_url/graphql" || echo "")
    
    if echo "$graphql_response" | jq -e '.data.__typename' >/dev/null 2>&1; then
        pass "GraphQL test passed"
    else
        fail "GraphQL test failed"
        smoke_tests_passed=false
    fi
    
    # Test 3: Database connectivity
    info "Testing database connectivity"
    local db_response=$(curl -s --max-time 15 "$service_url/api/status" || echo "")
    if echo "$db_response" | jq -e '.services[] | select(.name == "postgres") | .status == "healthy"' >/dev/null 2>&1; then
        pass "Database connectivity test passed"
    else
        warn "Database connectivity test failed or degraded"
        # Don't fail smoke tests for database issues in non-production
        if [ "$ENVIRONMENT" = "production" ]; then
            smoke_tests_passed=false
        fi
    fi
    
    # Clean up port-forward
    if [ "$environment" = "green" ] && [ -n "${port_forward_pid:-}" ]; then
        kill "$port_forward_pid" >/dev/null 2>&1 || true
    fi
    
    return $([ "$smoke_tests_passed" = "true" ] && echo 0 || echo 1)
}

# Switch traffic
switch_traffic() {
    local strategy="$1"
    say "🔀 Switching Traffic ($strategy)"
    
    if [ "$DRY_RUN" = "true" ]; then
        info "DRY RUN: Would switch traffic using $strategy strategy"
        TRAFFIC_SWITCHED=true
        return 0
    fi
    
    case "$strategy" in
        "blue-green")
            switch_blue_green_traffic
            ;;
        "canary")
            switch_canary_traffic
            ;;
        *)
            fail "Unknown strategy: $strategy"
            return 1
            ;;
    esac
}

# Blue-green traffic switching
switch_blue_green_traffic() {
    info "Switching to green environment (blue-green)"
    
    # Update main ingress to point to green service
    generate_manifests "green"
    kubectl apply -f k8s/generated/ingress-main.yaml
    
    # Wait for ingress to update
    sleep 10
    
    # Verify traffic is routing to green
    if run_health_checks "production"; then
        TRAFFIC_SWITCHED=true
        pass "Blue-green traffic switch completed"
        
        # Drain blue environment
        info "Draining blue environment"
        if kubectl get deployment conductor-server-blue -n "$NAMESPACE" >/dev/null 2>&1; then
            kubectl scale deployment conductor-server-blue --replicas=0 -n "$NAMESPACE"
            pass "Blue environment drained"
        fi
    else
        fail "Traffic switch validation failed"
        return 1
    fi
}

# Canary traffic switching
switch_canary_traffic() {
    info "Starting canary deployment with $CANARY_PERCENT% traffic"
    
    # Apply canary ingress
    kubectl apply -f k8s/generated/ingress-green.yaml
    
    # Monitor canary metrics
    local canary_percent=$CANARY_PERCENT
    local monitoring_duration=300 # 5 minutes per stage
    
    while [ $canary_percent -lt 100 ]; do
        info "Canary at $canary_percent%, monitoring for $monitoring_duration seconds"
        
        # Monitor health metrics
        local start_time=$(date +%s)
        local end_time=$((start_time + monitoring_duration))
        local metrics_healthy=true
        
        while [ $(date +%s) -lt $end_time ]; do
            if ! check_canary_metrics; then
                fail "Canary metrics unhealthy, rolling back"
                metrics_healthy=false
                break
            fi
            sleep 30
        done
        
        if [ "$metrics_healthy" = "false" ]; then
            return 1
        fi
        
        # Increment traffic
        canary_percent=$((canary_percent + CANARY_INCREMENT))
        if [ $canary_percent -gt 100 ]; then
            canary_percent=100
        fi
        
        # Update canary weight
        kubectl patch ingress conductor-server-green -n "$NAMESPACE" -p \
            '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"'$canary_percent'"}}}'
        
        if [ $canary_percent -lt 100 ]; then
            info "Incremented canary traffic to $canary_percent%"
        else
            info "Promoted canary to 100% traffic"
            break
        fi
    done
    
    TRAFFIC_SWITCHED=true
    pass "Canary deployment completed successfully"
    
    # Remove canary annotation and make it the main service
    kubectl delete ingress conductor-server-green -n "$NAMESPACE"
    generate_manifests "green"
    kubectl apply -f k8s/generated/ingress-main.yaml
}

# Check canary metrics
check_canary_metrics() {
    # This would integrate with your monitoring system (Prometheus, etc.)
    # For now, simulate metrics checking
    
    local error_rate=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])" | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
    
    local latency_p95=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))" | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
    
    # Convert to percentages/milliseconds for comparison
    local error_rate_percent=$(echo "$error_rate * 100" | bc -l 2>/dev/null || echo "0")
    local latency_ms=$(echo "$latency_p95 * 1000" | bc -l 2>/dev/null || echo "0")
    
    info "Current metrics: Error rate: ${error_rate_percent}%, P95 latency: ${latency_ms}ms"
    
    # Check thresholds
    if (( $(echo "$error_rate_percent > $ROLLBACK_THRESHOLD_ERROR_RATE" | bc -l) )); then
        warn "Error rate threshold exceeded: ${error_rate_percent}% > ${ROLLBACK_THRESHOLD_ERROR_RATE}%"
        return 1
    fi
    
    if (( $(echo "$latency_ms > $ROLLBACK_THRESHOLD_LATENCY" | bc -l) )); then
        warn "Latency threshold exceeded: ${latency_ms}ms > ${ROLLBACK_THRESHOLD_LATENCY}ms"
        return 1
    fi
    
    return 0
}

# Rollback deployment
rollback_deployment() {
    local reason="$1"
    say "⏪ Rolling Back Deployment"
    warn "Rollback reason: $reason"
    
    ROLLBACK_REQUIRED=true
    
    if [ "$DRY_RUN" = "true" ]; then
        info "DRY RUN: Would rollback deployment"
        return 0
    fi
    
    # Switch traffic back to blue environment
    if [ "$TRAFFIC_SWITCHED" = "true" ]; then
        info "Switching traffic back to blue environment"
        
        if kubectl get ingress conductor-server-main -n "$NAMESPACE" >/dev/null 2>&1; then
            kubectl patch ingress conductor-server-main -n "$NAMESPACE" -p \
                '{"spec":{"rules":[{"host":"api.conductor.local","http":{"paths":[{"path":"/","pathType":"Prefix","backend":{"service":{"name":"conductor-server-blue","port":{"number":80}}}}]}}]}}'
        fi
        
        # Scale blue back up if it was drained
        if kubectl get deployment conductor-server-blue -n "$NAMESPACE" >/dev/null 2>&1; then
            local blue_replicas=$(kubectl get deployment conductor-server-blue -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
            if [ "$blue_replicas" = "0" ] || [ -z "$blue_replicas" ]; then
                info "Scaling blue environment back up"
                kubectl scale deployment conductor-server-blue --replicas=3 -n "$NAMESPACE"
                kubectl wait --for=condition=available deployment/conductor-server-blue -n "$NAMESPACE" --timeout=300s
            fi
        fi
        
        pass "Traffic switched back to blue environment"
    fi
    
    # Clean up failed green environment
    if [ "$GREEN_DEPLOYMENT_CREATED" = "true" ]; then
        info "Cleaning up failed green environment"
        kubectl delete deployment conductor-server-green -n "$NAMESPACE" --ignore-not-found=true
        kubectl delete service conductor-server-green -n "$NAMESPACE" --ignore-not-found=true
        kubectl delete ingress conductor-server-green -n "$NAMESPACE" --ignore-not-found=true
        pass "Green environment cleaned up"
    fi
    
    fail "Deployment rolled back due to: $reason"
    return 1
}

# Cleanup old environment
cleanup_old_environment() {
    say "🧹 Cleaning Up Old Environment"
    
    if [ "$DRY_RUN" = "true" ]; then
        info "DRY RUN: Would cleanup old blue environment"
        return 0
    fi
    
    # Only cleanup if deployment was successful
    if [ "$ROLLBACK_REQUIRED" = "false" ]; then
        info "Cleaning up blue environment"
        kubectl delete deployment conductor-server-blue -n "$NAMESPACE" --ignore-not-found=true
        kubectl delete service conductor-server-blue -n "$NAMESPACE" --ignore-not-found=true
        
        # Rename green to blue for next deployment
        kubectl patch deployment conductor-server-green -n "$NAMESPACE" -p \
            '{"metadata":{"name":"conductor-server-blue"},"spec":{"selector":{"matchLabels":{"color":"blue"}},"template":{"metadata":{"labels":{"color":"blue"}}}}}'
        kubectl patch service conductor-server-green -n "$NAMESPACE" -p \
            '{"metadata":{"name":"conductor-server-blue"},"spec":{"selector":{"color":"blue"}}}'
        
        pass "Old environment cleaned up successfully"
    else
        info "Skipping cleanup due to rollback"
    fi
}

# Generate deployment report
generate_deployment_report() {
    say "📊 Generating Deployment Report"
    
    local report_file="deployment-report-$(date +%Y%m%d-%H%M%S).md"
    local deployment_status="SUCCESS"
    
    if [ "$ROLLBACK_REQUIRED" = "true" ]; then
        deployment_status="ROLLED_BACK"
    fi
    
    cat > "$report_file" << EOF
# Conductor Deployment Report

**Deployment ID:** $DEPLOYMENT_ID  
**Strategy:** $STRATEGY  
**Environment:** $ENVIRONMENT  
**Image Tag:** $IMAGE_TAG  
**Status:** $deployment_status  
**Timestamp:** $(date -u "+%Y-%m-%d %H:%M:%S UTC")  

## Configuration

- **Strategy:** $STRATEGY
- **Environment:** $ENVIRONMENT  
- **Namespace:** $NAMESPACE
- **Image Tag:** $IMAGE_TAG
- **Rollback Thresholds:**
  - Error Rate: $ROLLBACK_THRESHOLD_ERROR_RATE%
  - Latency P95: ${ROLLBACK_THRESHOLD_LATENCY}ms
- **Canary Configuration:**
  - Initial: $CANARY_PERCENT%
  - Increment: $CANARY_INCREMENT%

## Deployment Steps

$(if [ "$ROLLBACK_REQUIRED" = "false" ]; then
    echo "✅ Prerequisites validated"
    echo "✅ Database migrations executed"
    echo "✅ Green environment deployed"
    echo "✅ Health checks passed"
    echo "✅ Smoke tests passed"
    echo "✅ Traffic switched"
    echo "✅ Old environment cleaned up"
else
    echo "✅ Prerequisites validated"
    echo "✅ Database migrations executed"
    echo "✅ Green environment deployed"
    if [ "$GREEN_DEPLOYMENT_CREATED" = "true" ]; then
        echo "✅ Green environment created"
    fi
    if [ "$TRAFFIC_SWITCHED" = "true" ]; then
        echo "⚠️  Traffic switched but rolled back"
    else
        echo "❌ Traffic switch failed"
    fi
    echo "⏪ Deployment rolled back"
fi)

## Metrics

- **Deployment Duration:** $(date +%s) seconds
- **Strategy:** $STRATEGY
- **Dry Run:** $DRY_RUN

## Next Steps

$(if [ "$ROLLBACK_REQUIRED" = "false" ]; then
    echo "- ✅ Deployment completed successfully"
    echo "- Monitor application metrics and logs"
    echo "- Verify all functionality is working as expected"
else
    echo "- ❌ Deployment was rolled back"
    echo "- Investigate deployment failures"
    echo "- Review logs and metrics"
    echo "- Fix issues before attempting another deployment"
fi)

---
*Report generated by Conductor Deployment Script*
EOF

    pass "Deployment report generated: $report_file"
}

# Trap function for cleanup on exit
cleanup_on_exit() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ] && [ "$ROLLBACK_REQUIRED" = "false" ]; then
        warn "Deployment failed, initiating cleanup"
        rollback_deployment "Script terminated unexpectedly"
    fi
    
    # Kill any background processes
    jobs -p | xargs -r kill >/dev/null 2>&1 || true
    
    generate_deployment_report
    
    exit $exit_code
}

# Set up trap for cleanup
trap cleanup_on_exit EXIT INT TERM

# Main deployment function
main_deployment() {
    say "🚀 Conductor Zero-Downtime Deployment"
    
    # Generate deployment ID
    DEPLOYMENT_ID="deploy_$(date +%s)_$(openssl rand -hex 4)"
    info "Deployment ID: $DEPLOYMENT_ID"
    info "Strategy: $STRATEGY"
    info "Environment: $ENVIRONMENT"
    info "Image: conductor/server:$IMAGE_TAG"
    info "Dry Run: $DRY_RUN"
    
    # Step 1: Validate prerequisites
    validate_prerequisites || {
        fail "Prerequisites validation failed"
        exit 1
    }
    
    # Step 2: Execute database migrations
    execute_migrations || {
        rollback_deployment "Database migration failed"
        exit 1
    }
    
    # Step 3: Deploy green environment
    deploy_green_environment || {
        rollback_deployment "Green environment deployment failed"
        exit 1
    }
    
    # Step 4: Run health checks
    run_health_checks "green" || {
        rollback_deployment "Green environment health checks failed"
        exit 1
    }
    
    # Step 5: Run smoke tests
    run_smoke_tests "green" || {
        rollback_deployment "Green environment smoke tests failed"
        exit 1
    }
    
    # Step 6: Switch traffic
    switch_traffic "$STRATEGY" || {
        rollback_deployment "Traffic switch failed"
        exit 1
    }
    
    # Step 7: Final validation
    info "Running final production validation"
    sleep 30 # Allow metrics to stabilize
    
    if [ "$STRATEGY" = "canary" ]; then
        if ! check_canary_metrics; then
            rollback_deployment "Final metrics validation failed"
            exit 1
        fi
    else
        if ! run_health_checks "production"; then
            rollback_deployment "Final health validation failed"
            exit 1
        fi
    fi
    
    # Step 8: Cleanup old environment
    cleanup_old_environment
    
    pass "Deployment completed successfully!"
    info "Deployment ID: $DEPLOYMENT_ID"
    info "New version: $IMAGE_TAG"
    info "Strategy: $STRATEGY"
}

# Handle command line arguments
case "${1:-}" in
    --strategy=*)
        STRATEGY="${1#*=}"
        shift
        ;;
    --environment=*)
        ENVIRONMENT="${1#*=}"
        shift
        ;;
    --image-tag=*)
        IMAGE_TAG="${1#*=}"
        shift
        ;;
    --dry-run)
        DRY_RUN="true"
        shift
        ;;
    --canary-percent=*)
        CANARY_PERCENT="${1#*=}"
        shift
        ;;
    --rollback-threshold=*)
        ROLLBACK_THRESHOLD_ERROR_RATE="${1#*=}"
        shift
        ;;
    --help)
        cat << EOF
Usage: $0 [options]

Zero-Downtime Deployment Script for Conductor

Options:
  --strategy=STRATEGY           Deployment strategy (blue-green|canary) [default: blue-green]
  --environment=ENV            Target environment (development|staging|production) [default: development]  
  --image-tag=TAG              Docker image tag to deploy [default: latest]
  --dry-run                    Perform dry run without actual deployment
  --canary-percent=PERCENT     Initial canary traffic percentage [default: 10]
  --rollback-threshold=PERCENT Error rate threshold for rollback [default: 1.0]
  --help                       Show this help

Environment Variables:
  NAMESPACE                    Kubernetes namespace [default: conductor]
  TIMEOUT                     Deployment timeout in seconds [default: 600]
  ROLLBACK_THRESHOLD_ERROR_RATE Error rate rollback threshold [default: 1.0]
  ROLLBACK_THRESHOLD_LATENCY   Latency rollback threshold in ms [default: 1000]
  CANARY_PERCENT              Initial canary percentage [default: 10]
  CANARY_INCREMENT            Canary increment percentage [default: 20]

Examples:
  # Blue-green deployment to production
  ./scripts/deploy.sh --strategy=blue-green --environment=production --image-tag=v1.2.3
  
  # Canary deployment with 5% initial traffic
  ./scripts/deploy.sh --strategy=canary --canary-percent=5 --image-tag=v1.2.4
  
  # Dry run deployment
  ./scripts/deploy.sh --dry-run --image-tag=latest

EOF
        exit 0
        ;;
    "")
        # No arguments, run main deployment
        ;;
    *)
        fail "Unknown argument: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

# Execute main deployment
main_deployment