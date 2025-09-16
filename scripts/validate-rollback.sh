#!/bin/bash

# Maestro Conductor vNext - Rollback Validation Script
# Version: 1.0
# Usage: ./validate-rollback.sh [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATION_TIMEOUT=600
HEALTH_CHECK_RETRIES=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Help function
show_help() {
    cat << EOF
Maestro Conductor vNext Rollback Validation Script

USAGE:
    ./validate-rollback.sh [OPTIONS]

OPTIONS:
    --check-data-integrity    Perform comprehensive data integrity checks
    --verify-service-health   Verify all service health endpoints
    --confirm-customer-access Validate customer access and functionality
    --namespace NAMESPACE     Target specific namespace (default: all)
    --timeout SECONDS         Validation timeout (default: 600)
    --detailed                Show detailed validation results
    --json                    Output results in JSON format

EXAMPLES:
    ./validate-rollback.sh --check-data-integrity --verify-service-health
    ./validate-rollback.sh --confirm-customer-access --detailed
    ./validate-rollback.sh --namespace maestro-conductor-canary --json

EOF
}

# Parse command line arguments
CHECK_DATA_INTEGRITY=false
VERIFY_SERVICE_HEALTH=false
CONFIRM_CUSTOMER_ACCESS=false
TARGET_NAMESPACE="all"
TIMEOUT=$VALIDATION_TIMEOUT
DETAILED_OUTPUT=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --check-data-integrity)
            CHECK_DATA_INTEGRITY=true
            shift
            ;;
        --verify-service-health)
            VERIFY_SERVICE_HEALTH=true
            shift
            ;;
        --confirm-customer-access)
            CONFIRM_CUSTOMER_ACCESS=true
            shift
            ;;
        --namespace)
            TARGET_NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --detailed)
            DETAILED_OUTPUT=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Results tracking
VALIDATION_RESULTS=()
VALIDATION_ERRORS=()
VALIDATION_WARNINGS=()

# Add result function
add_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local details="${4:-}"

    VALIDATION_RESULTS+=("{
        \"test\": \"$test_name\",
        \"status\": \"$status\",
        \"message\": \"$message\",
        \"details\": \"$details\",
        \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
    }")

    if [[ "$status" == "FAIL" ]]; then
        VALIDATION_ERRORS+=("$test_name: $message")
    elif [[ "$status" == "WARN" ]]; then
        VALIDATION_WARNINGS+=("$test_name: $message")
    fi

    if [[ "$DETAILED_OUTPUT" == "true" ]]; then
        case "$status" in
            "PASS") log_success "$test_name: $message" ;;
            "FAIL") log_error "$test_name: $message" ;;
            "WARN") log_warning "$test_name: $message" ;;
            *) log_info "$test_name: $message" ;;
        esac
    fi
}

# Get target namespaces
get_target_namespaces() {
    local namespaces=()

    if [[ "$TARGET_NAMESPACE" == "all" ]]; then
        # Get all maestro-conductor namespaces
        mapfile -t namespaces < <(kubectl get namespaces -l "app=maestro-conductor" -o name | cut -d/ -f2)
        if [[ ${#namespaces[@]} -eq 0 ]]; then
            namespaces=("maestro-conductor" "maestro-conductor-canary")
        fi
    else
        namespaces=("$TARGET_NAMESPACE")
    fi

    echo "${namespaces[@]}"
}

# Check Kubernetes cluster connectivity
check_cluster_connectivity() {
    log_info "Checking Kubernetes cluster connectivity..."

    if kubectl cluster-info >/dev/null 2>&1; then
        local context
        context=$(kubectl config current-context 2>/dev/null || echo "unknown")
        add_result "cluster_connectivity" "PASS" "Connected to cluster" "context: $context"
    else
        add_result "cluster_connectivity" "FAIL" "Cannot connect to Kubernetes cluster"
        return 1
    fi
}

# Validate pod status
validate_pod_status() {
    log_info "Validating pod status..."

    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_target_namespaces)"
    local total_pods=0
    local healthy_pods=0
    local failed_pods=0

    for namespace in "${namespaces[@]}"; do
        if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
            add_result "pod_status_$namespace" "WARN" "Namespace does not exist"
            continue
        fi

        local pods_info
        pods_info=$(kubectl get pods -n "$namespace" --no-headers 2>/dev/null || echo "")

        if [[ -z "$pods_info" ]]; then
            add_result "pod_status_$namespace" "WARN" "No pods found in namespace"
            continue
        fi

        while IFS= read -r line; do
            if [[ -z "$line" ]]; then continue; fi

            ((total_pods++))
            local pod_name status ready restarts age
            read -r pod_name ready status restarts age <<< "$line"

            if [[ "$status" == "Running" && "$ready" =~ ^[0-9]+/[0-9]+$ ]]; then
                local ready_count total_count
                IFS='/' read -r ready_count total_count <<< "$ready"

                if [[ "$ready_count" == "$total_count" ]]; then
                    ((healthy_pods++))
                else
                    add_result "pod_readiness" "WARN" "Pod not fully ready: $pod_name ($ready)"
                fi
            else
                ((failed_pods++))
                add_result "pod_status" "FAIL" "Unhealthy pod: $pod_name (status: $status, ready: $ready)"
            fi
        done <<< "$pods_info"
    done

    if [[ $total_pods -eq 0 ]]; then
        add_result "pod_validation" "FAIL" "No pods found in any namespace"
    elif [[ $failed_pods -eq 0 ]]; then
        add_result "pod_validation" "PASS" "All $healthy_pods pods are healthy"
    else
        add_result "pod_validation" "FAIL" "$failed_pods out of $total_pods pods are unhealthy"
    fi
}

# Check service health endpoints
check_service_health() {
    if [[ "$VERIFY_SERVICE_HEALTH" != "true" ]]; then
        return 0
    fi

    log_info "Checking service health endpoints..."

    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_target_namespaces)"

    for namespace in "${namespaces[@]}"; do
        if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
            continue
        fi

        # Get all services with health endpoints
        local services
        mapfile -t services < <(kubectl get service -n "$namespace" -l "app.kubernetes.io/name=maestro-conductor" -o name 2>/dev/null || echo "")

        for service in "${services[@]}"; do
            if [[ -z "$service" ]]; then continue; fi

            local service_name
            service_name=$(echo "$service" | cut -d/ -f2)
            local service_ip port

            service_ip=$(kubectl get service "$service_name" -n "$namespace" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
            port=$(kubectl get service "$service_name" -n "$namespace" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "8080")

            if [[ -z "$service_ip" || "$service_ip" == "None" ]]; then
                add_result "health_check_$service_name" "WARN" "Service has no ClusterIP"
                continue
            fi

            # Health check with retries
            local health_url="http://${service_ip}:${port}/health"
            local retry_count=0
            local health_check_passed=false

            while [[ $retry_count -lt $HEALTH_CHECK_RETRIES ]]; do
                if kubectl run "temp-health-check-$$-$RANDOM" --rm -i --restart=Never --image=curlimages/curl --timeout=30s -- \
                   curl -f -s --max-time 10 "$health_url" >/dev/null 2>&1; then
                    health_check_passed=true
                    break
                fi

                ((retry_count++))
                sleep 2
            done

            if [[ "$health_check_passed" == "true" ]]; then
                add_result "health_check_$service_name" "PASS" "Health check successful"
            else
                add_result "health_check_$service_name" "FAIL" "Health check failed after $HEALTH_CHECK_RETRIES attempts"
            fi
        done
    done
}

# Validate data integrity
validate_data_integrity() {
    if [[ "$CHECK_DATA_INTEGRITY" != "true" ]]; then
        return 0
    fi

    log_info "Validating data integrity..."

    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_target_namespaces)"

    for namespace in "${namespaces[@]}"; do
        if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
            continue
        fi

        # Check PostgreSQL (event store)
        if kubectl get deployment postgresql -n "$namespace" >/dev/null 2>&1; then
            local pg_status
            pg_status=$(kubectl exec -n "$namespace" deploy/postgresql -- \
                psql -U postgres -d maestro -c "SELECT COUNT(*) FROM events;" 2>/dev/null | grep -E '[0-9]+' | head -1 | xargs || echo "0")

            if [[ "$pg_status" =~ ^[0-9]+$ ]] && [[ $pg_status -gt 0 ]]; then
                add_result "postgresql_integrity" "PASS" "Event store contains $pg_status events"
            else
                add_result "postgresql_integrity" "FAIL" "Event store appears empty or inaccessible"
            fi

            # Check for recent events
            local recent_events
            recent_events=$(kubectl exec -n "$namespace" deploy/postgresql -- \
                psql -U postgres -d maestro -c "SELECT COUNT(*) FROM events WHERE created_at > NOW() - INTERVAL '1 hour';" 2>/dev/null | grep -E '[0-9]+' | head -1 | xargs || echo "0")

            if [[ "$recent_events" =~ ^[0-9]+$ ]] && [[ $recent_events -gt 0 ]]; then
                add_result "postgresql_recent_activity" "PASS" "Recent activity detected: $recent_events events in last hour"
            else
                add_result "postgresql_recent_activity" "WARN" "No recent event activity detected"
            fi
        fi

        # Check Redis (cache/sessions)
        if kubectl get deployment redis -n "$namespace" >/dev/null 2>&1; then
            local redis_keys
            redis_keys=$(kubectl exec -n "$namespace" deploy/redis -- redis-cli dbsize 2>/dev/null || echo "0")

            if [[ "$redis_keys" =~ ^[0-9]+$ ]] && [[ $redis_keys -gt 0 ]]; then
                add_result "redis_integrity" "PASS" "Redis contains $redis_keys keys"
            else
                add_result "redis_integrity" "WARN" "Redis appears empty"
            fi

            # Check Redis connectivity
            if kubectl exec -n "$namespace" deploy/redis -- redis-cli ping 2>/dev/null | grep -q "PONG"; then
                add_result "redis_connectivity" "PASS" "Redis connectivity confirmed"
            else
                add_result "redis_connectivity" "FAIL" "Redis connectivity failed"
            fi
        fi

        # Check Neo4j (provenance graph)
        if kubectl get deployment neo4j -n "$namespace" >/dev/null 2>&1; then
            local neo4j_nodes
            neo4j_nodes=$(kubectl exec -n "$namespace" deploy/neo4j -- \
                cypher-shell -u neo4j -p password "MATCH (n) RETURN count(n) as count;" 2>/dev/null | tail -1 | tr -d '"' || echo "0")

            if [[ "$neo4j_nodes" =~ ^[0-9]+$ ]] && [[ $neo4j_nodes -gt 0 ]]; then
                add_result "neo4j_integrity" "PASS" "Provenance graph contains $neo4j_nodes nodes"
            else
                add_result "neo4j_integrity" "WARN" "Provenance graph appears empty"
            fi
        fi
    done
}

# Validate customer access
validate_customer_access() {
    if [[ "$CONFIRM_CUSTOMER_ACCESS" != "true" ]]; then
        return 0
    fi

    log_info "Validating customer access..."

    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_target_namespaces)"

    for namespace in "${namespaces[@]}"; do
        if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
            continue
        fi

        # Check API endpoint accessibility
        local api_service_ip
        api_service_ip=$(kubectl get service api-gateway -n "$namespace" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")

        if [[ -n "$api_service_ip" && "$api_service_ip" != "None" ]]; then
            # Test public API endpoint
            local api_url="http://${api_service_ip}:80/api/v1/health"
            if kubectl run "temp-api-check-$$-$RANDOM" --rm -i --restart=Never --image=curlimages/curl --timeout=30s -- \
               curl -f -s --max-time 10 "$api_url" >/dev/null 2>&1; then
                add_result "api_accessibility" "PASS" "API endpoint accessible"
            else
                add_result "api_accessibility" "FAIL" "API endpoint not accessible"
            fi

            # Test authentication endpoint
            local auth_url="http://${api_service_ip}:80/api/v1/auth/health"
            if kubectl run "temp-auth-check-$$-$RANDOM" --rm -i --restart=Never --image=curlimages/curl --timeout=30s -- \
               curl -f -s --max-time 10 "$auth_url" >/dev/null 2>&1; then
                add_result "auth_accessibility" "PASS" "Authentication endpoint accessible"
            else
                add_result "auth_accessibility" "FAIL" "Authentication endpoint not accessible"
            fi
        else
            add_result "api_gateway" "FAIL" "API Gateway service not found or has no ClusterIP"
        fi

        # Check ingress configuration
        local ingress_hosts
        mapfile -t ingress_hosts < <(kubectl get ingress -n "$namespace" -o jsonpath='{.items[*].spec.rules[*].host}' 2>/dev/null || echo "")

        if [[ ${#ingress_hosts[@]} -gt 0 ]]; then
            for host in "${ingress_hosts[@]}"; do
                if [[ -n "$host" ]]; then
                    add_result "ingress_config" "PASS" "Ingress configured for host: $host"
                fi
            done
        else
            add_result "ingress_config" "WARN" "No ingress hosts configured"
        fi
    done

    # Test workflow execution (if possible)
    log_info "Testing basic workflow execution..."

    # Create a simple test workflow
    local test_workflow='{
        "name": "rollback-validation-test",
        "steps": [
            {
                "name": "health-check",
                "type": "http",
                "config": {
                    "url": "http://httpbin.org/get",
                    "method": "GET"
                }
            }
        ]
    }'

    # This would need to be implemented based on actual API
    add_result "workflow_execution" "WARN" "Workflow execution test not implemented"
}

# Check deployment versions
check_deployment_versions() {
    log_info "Checking deployment versions..."

    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_target_namespaces)"

    for namespace in "${namespaces[@]}"; do
        if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
            continue
        fi

        local deployments
        mapfile -t deployments < <(kubectl get deployment -n "$namespace" -o name 2>/dev/null || echo "")

        for deployment in "${deployments[@]}"; do
            if [[ -z "$deployment" ]]; then continue; fi

            local deploy_name
            deploy_name=$(echo "$deployment" | cut -d/ -f2)

            local image version
            image=$(kubectl get "$deployment" -n "$namespace" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "unknown")
            version=$(echo "$image" | cut -d: -f2 2>/dev/null || echo "unknown")

            add_result "version_$deploy_name" "PASS" "Deployed version: $version" "image: $image"
        done
    done
}

# Performance baseline check
check_performance_baseline() {
    log_info "Checking performance baseline..."

    local namespaces
    IFS=' ' read -ra namespaces <<< "$(get_target_namespaces)"

    for namespace in "${namespaces[@]}"; do
        if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
            continue
        fi

        # Check CPU and memory usage
        local resource_usage
        resource_usage=$(kubectl top pods -n "$namespace" --no-headers 2>/dev/null || echo "")

        if [[ -n "$resource_usage" ]]; then
            local total_cpu=0
            local total_memory=0
            local pod_count=0

            while IFS= read -r line; do
                if [[ -z "$line" ]]; then continue; fi

                local pod_name cpu memory
                read -r pod_name cpu memory <<< "$line"

                # Convert to millicores and MB
                cpu_val=$(echo "$cpu" | sed 's/m//' | grep -o '[0-9]*' || echo "0")
                mem_val=$(echo "$memory" | sed 's/Mi//' | grep -o '[0-9]*' || echo "0")

                total_cpu=$((total_cpu + cpu_val))
                total_memory=$((total_memory + mem_val))
                ((pod_count++))
            done <<< "$resource_usage"

            if [[ $pod_count -gt 0 ]]; then
                local avg_cpu=$((total_cpu / pod_count))
                local avg_memory=$((total_memory / pod_count))

                if [[ $avg_cpu -lt 1000 ]]; then  # Less than 1 CPU core average
                    add_result "performance_cpu" "PASS" "Average CPU usage: ${avg_cpu}m per pod"
                else
                    add_result "performance_cpu" "WARN" "High average CPU usage: ${avg_cpu}m per pod"
                fi

                if [[ $avg_memory -lt 2048 ]]; then  # Less than 2GB average
                    add_result "performance_memory" "PASS" "Average memory usage: ${avg_memory}Mi per pod"
                else
                    add_result "performance_memory" "WARN" "High average memory usage: ${avg_memory}Mi per pod"
                fi
            fi
        else
            add_result "performance_metrics" "WARN" "Resource metrics not available"
        fi
    done
}

# Generate validation report
generate_validation_report() {
    local report_file="/tmp/rollback-validation-$(date +%Y%m%d-%H%M%S).json"
    local total_tests=${#VALIDATION_RESULTS[@]}
    local passed_tests=0
    local failed_tests=${#VALIDATION_ERRORS[@]}
    local warned_tests=${#VALIDATION_WARNINGS[@]}

    # Count passed tests
    for result in "${VALIDATION_RESULTS[@]}"; do
        if echo "$result" | grep -q '"status": "PASS"'; then
            ((passed_tests++))
        fi
    done

    # Create JSON report
    cat > "$report_file" << EOF
{
    "validation_summary": {
        "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
        "total_tests": $total_tests,
        "passed": $passed_tests,
        "failed": $failed_tests,
        "warnings": $warned_tests,
        "success_rate": $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l 2>/dev/null || echo "0")
    },
    "test_results": [
        $(IFS=','; echo "${VALIDATION_RESULTS[*]}")
    ],
    "errors": [
        $(printf '"%s",' "${VALIDATION_ERRORS[@]}" | sed 's/,$//')
    ],
    "warnings": [
        $(printf '"%s",' "${VALIDATION_WARNINGS[@]}" | sed 's/,$//')
    ]
}
EOF

    echo "$report_file"
}

# Output results
output_results() {
    local report_file
    report_file=$(generate_validation_report)

    if [[ "$JSON_OUTPUT" == "true" ]]; then
        cat "$report_file"
    else
        log_info "=== ROLLBACK VALIDATION SUMMARY ==="

        local total_tests=${#VALIDATION_RESULTS[@]}
        local failed_tests=${#VALIDATION_ERRORS[@]}
        local warned_tests=${#VALIDATION_WARNINGS[@]}
        local passed_tests=$((total_tests - failed_tests - warned_tests))

        echo -e "Total Tests: $total_tests"
        echo -e "${GREEN}Passed: $passed_tests${NC}"
        echo -e "${YELLOW}Warnings: $warned_tests${NC}"
        echo -e "${RED}Failed: $failed_tests${NC}"

        if [[ $failed_tests -gt 0 ]]; then
            echo -e "\n${RED}CRITICAL ISSUES:${NC}"
            for error in "${VALIDATION_ERRORS[@]}"; do
                echo -e "  ❌ $error"
            done
        fi

        if [[ $warned_tests -gt 0 ]]; then
            echo -e "\n${YELLOW}WARNINGS:${NC}"
            for warning in "${VALIDATION_WARNINGS[@]}"; do
                echo -e "  ⚠️  $warning"
            done
        fi

        echo -e "\nDetailed report: $report_file"
    fi

    # Return appropriate exit code
    if [[ $failed_tests -gt 0 ]]; then
        return 1
    else
        return 0
    fi
}

# Main validation function
main() {
    log_info "Starting rollback validation..."

    # Always run basic validations
    check_cluster_connectivity
    validate_pod_status
    check_deployment_versions
    check_performance_baseline

    # Run optional validations based on flags
    check_service_health
    validate_data_integrity
    validate_customer_access

    # Output results
    output_results
}

# Execute main function
main "$@"