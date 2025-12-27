#!/bin/bash
# Production Rollback & Canary Deployment Safety Script
# Comprehensive rollback mechanisms for IntelGraph platform

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-intelgraph-prod}"
RELEASE_NAME="${RELEASE_NAME:-intelgraph}"
CANARY_PERCENTAGE="${CANARY_PERCENTAGE:-10}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_TIMEOUT="${ROLLBACK_TIMEOUT:-600}"
EVIDENCE_DIR="${EVIDENCE_DIR:-${PROJECT_ROOT}/evidence/rollbacks}"

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }
bold() { echo -e "${BOLD}$1${NC}"; }

record_rollback_evidence() {
    local action="$1"
    local status="$2"
    local target_version="${3:-}"
    local timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
    local evidence_path="${EVIDENCE_DIR}/rollback-${action}-${timestamp}.json"
    local git_sha="${GIT_SHA:-$(git -C "${PROJECT_ROOT}" rev-parse HEAD 2>/dev/null || echo "unknown")}"

    mkdir -p "${EVIDENCE_DIR}"

    jq -n \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg action "${action}" \
        --arg status "${status}" \
        --arg namespace "${NAMESPACE}" \
        --arg release "${RELEASE_NAME}" \
        --arg targetVersion "${target_version}" \
        --arg logUrl "${DEPLOYMENT_LOG_URL:-}" \
        --arg evidencePath "${evidence_path}" \
        --arg gitSha "${git_sha}" \
        --arg rollbackReason "${ROLLBACK_REASON:-}" \
        --arg currentRevision "${ROLLBACK_CURRENT_REVISION:-}" \
        --arg targetRevision "${ROLLBACK_TARGET_REVISION:-}" \
        --arg stableVersion "${ROLLBACK_STABLE_VERSION:-}" \
        --arg canaryVersion "${ROLLBACK_CANARY_VERSION:-}" \
        '{
          timestamp: $timestamp,
          action: $action,
          status: $status,
          namespace: $namespace,
          release: $release,
          target_version: $targetVersion,
          log_url: $logUrl,
          evidence_path: $evidencePath,
          git_sha: $gitSha,
          rollback_reason: $rollbackReason,
          current_revision: $currentRevision,
          target_revision: $targetRevision,
          stable_version: $stableVersion,
          canary_version: $canaryVersion
        }' > "${evidence_path}"

    export ROLLBACK_EVIDENCE_PATH="${evidence_path}"
    log "Evidence recorded: ${evidence_path}"
    if [ -n "${DEPLOYMENT_LOG_URL:-}" ]; then
        info "Deployment logs: ${DEPLOYMENT_LOG_URL}"
    fi
}

emit_audit_event() {
    local action="$1"
    local status="$2"
    local target_version="${3:-}"

    PROJECT_ROOT="${PROJECT_ROOT}" \
    ROLLBACK_AUDIT_ACTION="${action}" \
    ROLLBACK_AUDIT_STATUS="${status}" \
    ROLLBACK_AUDIT_TARGET_VERSION="${target_version}" \
    ROLLBACK_AUDIT_NAMESPACE="${NAMESPACE}" \
    ROLLBACK_AUDIT_RELEASE="${RELEASE_NAME}" \
    ROLLBACK_AUDIT_LOG_URL="${DEPLOYMENT_LOG_URL:-}" \
    ROLLBACK_AUDIT_EVIDENCE_PATH="${ROLLBACK_EVIDENCE_PATH:-}" \
    ROLLBACK_AUDIT_REASON="${ROLLBACK_REASON:-}" \
    node <<'EOF'
const { appendAuditEvent } = require(`${process.env.PROJECT_ROOT}/agents/audit/logStub`);

appendAuditEvent({
  event: 'deployment-rollback',
  action: process.env.ROLLBACK_AUDIT_ACTION,
  status: process.env.ROLLBACK_AUDIT_STATUS,
  targetVersion: process.env.ROLLBACK_AUDIT_TARGET_VERSION,
  namespace: process.env.ROLLBACK_AUDIT_NAMESPACE,
  release: process.env.ROLLBACK_AUDIT_RELEASE,
  logUrl: process.env.ROLLBACK_AUDIT_LOG_URL,
  evidencePath: process.env.ROLLBACK_AUDIT_EVIDENCE_PATH,
  reason: process.env.ROLLBACK_AUDIT_REASON,
  source: 'scripts/rollback-deployment.sh',
});
EOF
}

finalize_rollback_event() {
    local action="$1"
    local status="$2"
    local target_version="${3:-}"

    record_rollback_evidence "${action}" "${status}" "${target_version}"
    emit_audit_event "${action}" "${status}" "${target_version}"
}

show_help() {
    cat << EOF
🔄 IntelGraph Rollback & Canary Deployment Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    canary-deploy <version>     Deploy canary version with traffic split
    canary-promote              Promote canary to full production
    canary-abort                Abort canary and rollback to stable
    rollback [version]          Rollback to previous version or specific version
    status                      Show current deployment status
    health-check                Run comprehensive health checks
    traffic-split <percentage>  Adjust canary traffic percentage
    emergency-stop              Emergency stop all deployments
    list-versions               List available versions for rollback
    help                        Show this help message

Options:
    --namespace <ns>            Kubernetes namespace (default: intelgraph-prod)
    --release <name>            Helm release name (default: intelgraph)
    --timeout <seconds>         Operation timeout (default: 600)
    --canary-percent <percent>  Canary traffic percentage (default: 10)
    --dry-run                   Show what would be done without executing
    --force                     Skip confirmations (dangerous!)

Examples:
    $0 canary-deploy v1.2.3              # Deploy v1.2.3 as 10% canary
    $0 canary-deploy v1.2.3 --canary-percent 20  # Deploy with 20% traffic
    $0 canary-promote                     # Promote canary to 100%
    $0 canary-abort                       # Abort canary, rollback to stable
    $0 rollback v1.2.1                   # Rollback to specific version
    $0 rollback                           # Rollback to previous version
    $0 emergency-stop                     # Emergency shutdown
EOF
}

# Check dependencies
check_deps() {
    local missing_deps=()

    command -v kubectl >/dev/null 2>&1 || missing_deps+=("kubectl")
    command -v helm >/dev/null 2>&1 || missing_deps+=("helm")
    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")

    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi

    # Verify kubectl connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Verify namespace exists
    if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
        error "Namespace '${NAMESPACE}' does not exist"
        exit 1
    fi
}

# Get current deployment status
get_deployment_status() {
    local status_file=$(mktemp)

    cat > "${status_file}" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "namespace": "${NAMESPACE}",
  "release": "${RELEASE_NAME}"
}
EOF

    # Get Helm release info
    if helm status "${RELEASE_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
        local current_version=$(helm get values "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq -r '.image.tag // "unknown"')
        local revision=$(helm status "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq -r '.version')
        local status=$(helm status "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq -r '.info.status')

        jq --arg ver "$current_version" --arg rev "$revision" --arg stat "$status" \
           '.helm = {version: $ver, revision: ($rev | tonumber), status: $stat}' \
           "${status_file}" > "${status_file}.tmp" && mv "${status_file}.tmp" "${status_file}"
    fi

    # Get deployment info
    if kubectl get deployment "${RELEASE_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
        local replicas=$(kubectl get deployment "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq '.status.replicas // 0')
        local ready_replicas=$(kubectl get deployment "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq '.status.readyReplicas // 0')

        jq --arg replicas "$replicas" --arg ready "$ready_replicas" \
           '.deployment = {replicas: ($replicas | tonumber), ready: ($ready | tonumber)}' \
           "${status_file}" > "${status_file}.tmp" && mv "${status_file}.tmp" "${status_file}"
    fi

    # Get canary deployment info if exists
    if kubectl get deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" >/dev/null 2>&1; then
        local canary_replicas=$(kubectl get deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" -o json | jq '.status.replicas // 0')
        local canary_ready=$(kubectl get deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" -o json | jq '.status.readyReplicas // 0')
        local canary_version=$(kubectl get deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" -o json | jq -r '.spec.template.spec.containers[0].image | split(":")[1] // "unknown"')

        jq --arg replicas "$canary_replicas" --arg ready "$canary_ready" --arg version "$canary_version" \
           '.canary = {replicas: ($replicas | tonumber), ready: ($ready | tonumber), version: $version}' \
           "${status_file}" > "${status_file}.tmp" && mv "${status_file}.tmp" "${status_file}"
    fi

    cat "${status_file}"
    rm -f "${status_file}" "${status_file}.tmp"
}

# Health check function
run_health_check() {
    local service_url="${1:-}"
    local timeout="${2:-30}"

    if [ -z "$service_url" ]; then
        # Get service URL from ingress or service
        service_url=$(kubectl get ingress "${RELEASE_NAME}" -n "${NAMESPACE}" -o json 2>/dev/null | \
                     jq -r '.spec.rules[0].host // empty' | head -1)

        if [ -z "$service_url" ]; then
            service_url="http://$(kubectl get service "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | \
                               jq -r '.status.loadBalancer.ingress[0].ip // "localhost"'):80"
        else
            service_url="https://${service_url}"
        fi
    fi

    info "Running health checks against: ${service_url}"

    # Basic health check
    if ! curl -f "${service_url}/health" --max-time "${timeout}" --silent >/dev/null; then
        error "Basic health check failed"
        return 1
    fi

    # GraphQL health check
    if ! curl -f "${service_url}/health/graphql" --max-time "${timeout}" --silent >/dev/null; then
        error "GraphQL health check failed"
        return 1
    fi

    # Database health checks
    local health_response=$(curl -s "${service_url}/health" --max-time "${timeout}")
    local pg_status=$(echo "$health_response" | jq -r '.services.postgres // "unknown"')
    local neo4j_status=$(echo "$health_response" | jq -r '.services.neo4j // "unknown"')
    local redis_status=$(echo "$health_response" | jq -r '.services.redis // "unknown"')

    if [ "$pg_status" != "healthy" ]; then
        error "PostgreSQL health check failed: $pg_status"
        return 1
    fi

    if [ "$neo4j_status" != "healthy" ]; then
        error "Neo4j health check failed: $neo4j_status"
        return 1
    fi

    # Redis is allowed to be degraded
    if [ "$redis_status" != "healthy" ] && [ "$redis_status" != "degraded" ]; then
        warn "Redis health check concerning: $redis_status"
    fi

    # Test GraphQL query
    local graphql_test=$(curl -s -X POST "${service_url}/graphql" \
                        -H "Content-Type: application/json" \
                        -d '{"query":"query Health { __typename }"}' \
                        --max-time "${timeout}")

    if ! echo "$graphql_test" | jq -e '.data.__typename' >/dev/null; then
        error "GraphQL query test failed"
        return 1
    fi

    log "All health checks passed ✅"
    return 0
}

# Canary deployment
deploy_canary() {
    local version="$1"
    local canary_percent="${CANARY_PERCENTAGE}"

    if [ -z "$version" ]; then
        error "Version is required for canary deployment"
        exit 1
    fi

    bold "🚀 Starting canary deployment of version: $version"

    # Get current stable version for rollback reference
    local stable_version=$(helm get values "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq -r '.image.tag // "unknown"')
    info "Current stable version: $stable_version"

    # Deploy canary with Helm
    info "Deploying canary version $version with ${canary_percent}% traffic..."

    helm upgrade "${RELEASE_NAME}" ./deploy/helm/intelgraph \
        --namespace "${NAMESPACE}" \
        --set "image.tag=${version}" \
        --set "canary.enabled=true" \
        --set "canary.version=${version}" \
        --set "canary.trafficPercent=${canary_percent}" \
        --set "stable.version=${stable_version}" \
        --timeout "${ROLLBACK_TIMEOUT}s" \
        --wait

    # Wait for canary pods to be ready
    info "Waiting for canary pods to be ready..."
    kubectl rollout status deployment/"${RELEASE_NAME}-canary" -n "${NAMESPACE}" --timeout="${HEALTH_CHECK_TIMEOUT}s"

    # Run health checks on canary
    info "Running health checks on canary deployment..."
    local canary_service_url="https://canary.$(kubectl get ingress "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq -r '.spec.rules[0].host')"

    if run_health_check "$canary_service_url" 30; then
        log "Canary deployment successful! 🎉"
        info "Canary version $version is receiving ${canary_percent}% of traffic"
        info "Monitor metrics and run 'canary-promote' to promote to 100%"
        info "Or run 'canary-abort' to rollback if issues are detected"
    else
        error "Canary health checks failed! Auto-rolling back..."
        abort_canary
        exit 1
    fi
}

# Promote canary to full production
promote_canary() {
    bold "🎯 Promoting canary to full production"

    # Check if canary exists
    if ! kubectl get deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" >/dev/null 2>&1; then
        error "No canary deployment found to promote"
        exit 1
    fi

    local canary_version=$(kubectl get deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" -o json | \
                          jq -r '.spec.template.spec.containers[0].image | split(":")[1]')

    info "Promoting canary version $canary_version to 100% traffic..."

    # Update stable deployment to canary version
    helm upgrade "${RELEASE_NAME}" ./deploy/helm/intelgraph \
        --namespace "${NAMESPACE}" \
        --set "image.tag=${canary_version}" \
        --set "canary.enabled=false" \
        --timeout "${ROLLBACK_TIMEOUT}s" \
        --wait

    # Wait for stable deployment to be ready
    kubectl rollout status deployment/"${RELEASE_NAME}" -n "${NAMESPACE}" --timeout="${HEALTH_CHECK_TIMEOUT}s"

    # Remove canary deployment
    info "Cleaning up canary deployment..."
    kubectl delete deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" --ignore-not-found

    # Final health check
    if run_health_check; then
        log "Canary promotion successful! 🎉"
        info "Version $canary_version is now serving 100% of traffic"
    else
        error "Health checks failed after promotion!"
        exit 1
    fi
}

# Abort canary and rollback
abort_canary() {
    bold "⚠️  Aborting canary deployment and rolling back"

    # Remove canary deployment
    info "Removing canary deployment..."
    kubectl delete deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" --ignore-not-found

    # Reset traffic to 100% stable
    local stable_version=$(helm get values "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq -r '.stable.version // .image.tag')
    local canary_version="unknown"
    if kubectl get deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" >/dev/null 2>&1; then
        canary_version=$(kubectl get deployment "${RELEASE_NAME}-canary" -n "${NAMESPACE}" -o json | jq -r '.spec.template.spec.containers[0].image | split(\":\")[1] // \"unknown\"')
    fi

    helm upgrade "${RELEASE_NAME}" ./deploy/helm/intelgraph \
        --namespace "${NAMESPACE}" \
        --set "image.tag=${stable_version}" \
        --set "canary.enabled=false" \
        --timeout "${ROLLBACK_TIMEOUT}s" \
        --wait

    if run_health_check; then
        log "Canary aborted and rollback successful ✅"
        ROLLBACK_STABLE_VERSION="${stable_version}"
        ROLLBACK_CANARY_VERSION="${canary_version}"
        finalize_rollback_event "canary-abort" "success" "${stable_version}"
    else
        error "Rollback health checks failed!"
        ROLLBACK_STABLE_VERSION="${stable_version}"
        ROLLBACK_CANARY_VERSION="${canary_version}"
        finalize_rollback_event "canary-abort" "failed" "${stable_version}"
        exit 1
    fi
}

# Rollback to previous or specific version
rollback_deployment() {
    local target_version="$1"
    local rollback_target_version=""

    if [ -z "$target_version" ]; then
        # Rollback to previous Helm revision
        bold "🔄 Rolling back to previous version"

        local current_revision=$(helm status "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq -r '.version')
        local target_revision=$((current_revision - 1))

        if [ "$target_revision" -lt 1 ]; then
            error "No previous revision found to rollback to"
            exit 1
        fi

        info "Rolling back from revision $current_revision to $target_revision..."
        ROLLBACK_CURRENT_REVISION="${current_revision}"
        ROLLBACK_TARGET_REVISION="${target_revision}"

        helm rollback "${RELEASE_NAME}" "$target_revision" -n "${NAMESPACE}" --timeout "${ROLLBACK_TIMEOUT}s" --wait
    else
        # Rollback to specific version
        bold "🔄 Rolling back to version: $target_version"
        rollback_target_version="${target_version}"

        helm upgrade "${RELEASE_NAME}" ./deploy/helm/intelgraph \
            --namespace "${NAMESPACE}" \
            --set "image.tag=${target_version}" \
            --set "canary.enabled=false" \
            --timeout "${ROLLBACK_TIMEOUT}s" \
            --wait
    fi

    # Wait for rollback to complete
    kubectl rollout status deployment/"${RELEASE_NAME}" -n "${NAMESPACE}" --timeout="${HEALTH_CHECK_TIMEOUT}s"

    # Health check after rollback
    if run_health_check; then
        if [ -z "${rollback_target_version}" ]; then
            rollback_target_version=$(helm get values "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq -r '.image.tag // "unknown"')
        fi
        log "Rollback successful! ✅"
        finalize_rollback_event "rollback" "success" "${rollback_target_version}"
    else
        if [ -z "${rollback_target_version}" ]; then
            rollback_target_version=$(helm get values "${RELEASE_NAME}" -n "${NAMESPACE}" -o json | jq -r '.image.tag // "unknown"')
        fi
        error "Rollback health checks failed!"
        finalize_rollback_event "rollback" "failed" "${rollback_target_version}"
        exit 1
    fi
}

# Emergency stop
emergency_stop() {
    bold "🚨 EMERGENCY STOP - Scaling down all deployments"

    warn "This will stop all traffic to the application!"
    if [ "${FORCE:-}" != "true" ]; then
        read -p "Are you sure? Type 'EMERGENCY' to confirm: " confirm
        if [ "$confirm" != "EMERGENCY" ]; then
            info "Emergency stop cancelled"
            exit 0
        fi
    fi

    # Scale down all deployments
    kubectl scale deployment "${RELEASE_NAME}" --replicas=0 -n "${NAMESPACE}" || true
    kubectl scale deployment "${RELEASE_NAME}-canary" --replicas=0 -n "${NAMESPACE}" || true

    error "EMERGENCY STOP EXECUTED - All deployments scaled to 0 replicas"
    warn "Run 'kubectl scale deployment ${RELEASE_NAME} --replicas=3 -n ${NAMESPACE}' to restore service"
}

# List available versions
list_versions() {
    info "Available versions from Helm history:"
    helm history "${RELEASE_NAME}" -n "${NAMESPACE}" --max 10

    info "\nAvailable container tags (last 10):"
    # This would query your container registry - adapt as needed
    echo "Query your container registry for available tags"
}

# Show current status
show_status() {
    bold "📊 Current Deployment Status"

    local status=$(get_deployment_status)

    echo "$status" | jq -r '
        "Timestamp: " + .timestamp,
        "Namespace: " + .namespace,
        "Release: " + .release,
        "",
        "Helm Release:",
        "  Version: " + (.helm.version // "unknown"),
        "  Revision: " + (.helm.revision // 0 | tostring),
        "  Status: " + (.helm.status // "unknown"),
        "",
        "Stable Deployment:",
        "  Replicas: " + (.deployment.replicas // 0 | tostring),
        "  Ready: " + (.deployment.ready // 0 | tostring),
        "",
        if .canary then
            "Canary Deployment:\n" +
            "  Version: " + .canary.version + "\n" +
            "  Replicas: " + (.canary.replicas | tostring) + "\n" +
            "  Ready: " + (.canary.ready | tostring)
        else
            "Canary: Not deployed"
        end
    '

    echo
    info "Kubernetes Resources:"
    kubectl get deployments,services,ingress -n "${NAMESPACE}" -l app.kubernetes.io/name=intelgraph
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --release)
                RELEASE_NAME="$2"
                shift 2
                ;;
            --timeout)
                ROLLBACK_TIMEOUT="$2"
                HEALTH_CHECK_TIMEOUT="$2"
                shift 2
                ;;
            --canary-percent)
                CANARY_PERCENTAGE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --force)
                FORCE="true"
                shift
                ;;
            *)
                break
                ;;
        esac
    done
}

# Main function
main() {
    parse_args "$@"
    check_deps

    local command="${1:-help}"

    case "$command" in
        canary-deploy)
            deploy_canary "${2:-}"
            ;;
        canary-promote)
            promote_canary
            ;;
        canary-abort)
            abort_canary
            ;;
        rollback)
            rollback_deployment "${2:-}"
            ;;
        status)
            show_status
            ;;
        health-check)
            run_health_check
            ;;
        emergency-stop)
            emergency_stop
            ;;
        list-versions)
            list_versions
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
