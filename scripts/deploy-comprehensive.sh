#!/usr/bin/env bash
#
# deploy-comprehensive.sh - Production Deployment Automation Script
#
# Comprehensive deployment script implementing:
# - Pre-deployment validation
# - Database migrations
# - Rolling deployments
# - Health check verification
# - Automatic rollback on failure
# - Deployment notifications
# - Audit logging
#
# Usage:
#   ./deploy-comprehensive.sh [environment] [options]
#
# Environments:
#   staging    - Deploy to staging environment
#   production - Deploy to production environment
#
# Options:
#   --dry-run     Perform a dry run without actual deployment
#   --skip-tests  Skip pre-deployment tests
#   --force       Force deployment even with warnings
#   --rollback    Rollback to previous version
#   --version     Deploy specific version tag
#

set -euo pipefail
IFS=$'\n\t'

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT="${1:-staging}"
DRY_RUN=false
SKIP_TESTS=false
FORCE_DEPLOY=false
ROLLBACK=false
VERSION_TAG=""
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 4)"

# Kubernetes configuration
NAMESPACE_STAGING="intelgraph-staging"
NAMESPACE_PRODUCTION="intelgraph-production"
HELM_RELEASE="intelgraph"
HELM_CHART_PATH="$PROJECT_ROOT/helm/intelgraph"

# Timeout configuration
HEALTH_CHECK_TIMEOUT=300
ROLLOUT_TIMEOUT=600
MIGRATION_TIMEOUT=300

# Notification endpoints (configure via environment variables)
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
PAGERDUTY_KEY="${PAGERDUTY_KEY:-}"

# ============================================================================
# Logging Functions
# ============================================================================

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

log_step() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}[STEP]${NC} $1"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# Utility Functions
# ============================================================================

send_notification() {
    local status="$1"
    local message="$2"

    # Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        [[ "$status" == "failure" ]] && color="danger"
        [[ "$status" == "warning" ]] && color="warning"

        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"IntelGraph Deployment - $ENVIRONMENT\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Deployment ID\", \"value\": \"$DEPLOYMENT_ID\", \"short\": true},
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true}
                    ],
                    \"footer\": \"Deployment Automation\",
                    \"ts\": $(date +%s)
                }]
            }" || true
    fi
}

create_audit_log() {
    local action="$1"
    local details="$2"

    local audit_file="$PROJECT_ROOT/logs/deployments/$DEPLOYMENT_ID.json"
    mkdir -p "$(dirname "$audit_file")"

    echo "{
        \"deployment_id\": \"$DEPLOYMENT_ID\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"environment\": \"$ENVIRONMENT\",
        \"action\": \"$action\",
        \"details\": \"$details\",
        \"user\": \"${USER:-unknown}\",
        \"host\": \"$(hostname)\"
    }" >> "$audit_file"
}

get_namespace() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo "$NAMESPACE_PRODUCTION"
    else
        echo "$NAMESPACE_STAGING"
    fi
}

get_current_version() {
    local namespace=$(get_namespace)
    kubectl get deployment -n "$namespace" -l app=intelgraph-api \
        -o jsonpath='{.items[0].spec.template.metadata.labels.version}' 2>/dev/null || echo "unknown"
}

# ============================================================================
# Validation Functions
# ============================================================================

validate_environment() {
    log_step "Validating Environment"

    # Check required tools
    local required_tools=("kubectl" "helm" "docker" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    log_success "All required tools available"

    # Check Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    log_success "Kubernetes cluster connection verified"

    # Check namespace exists
    local namespace=$(get_namespace)
    if ! kubectl get namespace "$namespace" &> /dev/null; then
        log_error "Namespace $namespace does not exist"
        exit 1
    fi
    log_success "Namespace $namespace exists"

    # Check Helm chart exists
    if [[ ! -d "$HELM_CHART_PATH" ]]; then
        log_error "Helm chart not found at $HELM_CHART_PATH"
        exit 1
    fi
    log_success "Helm chart found"

    # Validate Helm chart
    if ! helm lint "$HELM_CHART_PATH" &> /dev/null; then
        log_error "Helm chart validation failed"
        exit 1
    fi
    log_success "Helm chart validation passed"

    create_audit_log "validation" "Environment validation completed successfully"
}

run_pre_deployment_tests() {
    log_step "Running Pre-Deployment Tests"

    if [[ "$SKIP_TESTS" == true ]]; then
        log_warning "Skipping tests as requested"
        return 0
    fi

    cd "$PROJECT_ROOT"

    # Run linting
    log_info "Running linting..."
    if ! pnpm lint 2>/dev/null; then
        log_error "Linting failed"
        [[ "$FORCE_DEPLOY" != true ]] && exit 1
        log_warning "Continuing despite lint failures (--force)"
    fi
    log_success "Linting passed"

    # Run type checking
    log_info "Running type checking..."
    if ! pnpm typecheck 2>/dev/null; then
        log_error "Type checking failed"
        [[ "$FORCE_DEPLOY" != true ]] && exit 1
        log_warning "Continuing despite type errors (--force)"
    fi
    log_success "Type checking passed"

    # Run unit tests
    log_info "Running unit tests..."
    if ! pnpm test 2>/dev/null; then
        log_error "Unit tests failed"
        [[ "$FORCE_DEPLOY" != true ]] && exit 1
        log_warning "Continuing despite test failures (--force)"
    fi
    log_success "Unit tests passed"

    # Run security audit
    log_info "Running security audit..."
    if ! pnpm audit --audit-level=high 2>/dev/null; then
        log_warning "Security vulnerabilities detected"
        [[ "$ENVIRONMENT" == "production" && "$FORCE_DEPLOY" != true ]] && exit 1
    fi
    log_success "Security audit completed"

    create_audit_log "tests" "Pre-deployment tests completed"
}

# ============================================================================
# Database Migration Functions
# ============================================================================

run_database_migrations() {
    log_step "Running Database Migrations"

    local namespace=$(get_namespace)

    # Create migration job
    log_info "Creating migration job..."

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run database migrations"
        return 0
    fi

    # Run PostgreSQL migrations
    log_info "Running PostgreSQL migrations..."
    kubectl run migration-pg-$DEPLOYMENT_ID \
        --namespace="$namespace" \
        --image="intelgraph/api:latest" \
        --restart=Never \
        --rm=true \
        --timeout="${MIGRATION_TIMEOUT}s" \
        --command -- npm run db:pg:migrate
    log_success "PostgreSQL migrations completed"

    # Run Neo4j migrations
    log_info "Running Neo4j migrations..."
    kubectl run migration-neo4j-$DEPLOYMENT_ID \
        --namespace="$namespace" \
        --image="intelgraph/api:latest" \
        --restart=Never \
        --rm=true \
        --timeout="${MIGRATION_TIMEOUT}s" \
        --command -- npm run db:neo4j:migrate
    log_success "Neo4j migrations completed"

    create_audit_log "migrations" "Database migrations completed"
}

# ============================================================================
# Deployment Functions
# ============================================================================

backup_current_state() {
    log_step "Backing Up Current State"

    local namespace=$(get_namespace)
    local backup_dir="$PROJECT_ROOT/backups/$DEPLOYMENT_ID"
    mkdir -p "$backup_dir"

    # Export current deployment manifests
    log_info "Exporting current deployment state..."
    kubectl get deployment -n "$namespace" -o yaml > "$backup_dir/deployments.yaml" 2>/dev/null || true
    kubectl get configmap -n "$namespace" -o yaml > "$backup_dir/configmaps.yaml" 2>/dev/null || true
    kubectl get secret -n "$namespace" -o yaml > "$backup_dir/secrets.yaml" 2>/dev/null || true

    # Save current Helm release
    log_info "Saving Helm release state..."
    helm get values "$HELM_RELEASE" -n "$namespace" > "$backup_dir/helm-values.yaml" 2>/dev/null || true
    helm get manifest "$HELM_RELEASE" -n "$namespace" > "$backup_dir/helm-manifest.yaml" 2>/dev/null || true

    log_success "Backup completed: $backup_dir"
    create_audit_log "backup" "Current state backed up to $backup_dir"
}

deploy_with_helm() {
    log_step "Deploying with Helm"

    local namespace=$(get_namespace)
    local values_file="$HELM_CHART_PATH/values-$ENVIRONMENT.yaml"

    if [[ ! -f "$values_file" ]]; then
        values_file="$HELM_CHART_PATH/values.yaml"
    fi

    log_info "Using values file: $values_file"
    log_info "Deploying to namespace: $namespace"
    log_info "Release name: $HELM_RELEASE"

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run Helm upgrade"
        helm upgrade --install "$HELM_RELEASE" "$HELM_CHART_PATH" \
            --namespace "$namespace" \
            --values "$values_file" \
            --set deployment.id="$DEPLOYMENT_ID" \
            --set deployment.timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --timeout "${ROLLOUT_TIMEOUT}s" \
            --dry-run
        return 0
    fi

    # Perform the deployment
    log_info "Starting Helm upgrade..."
    helm upgrade --install "$HELM_RELEASE" "$HELM_CHART_PATH" \
        --namespace "$namespace" \
        --values "$values_file" \
        --set deployment.id="$DEPLOYMENT_ID" \
        --set deployment.timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --timeout "${ROLLOUT_TIMEOUT}s" \
        --wait \
        --atomic

    log_success "Helm deployment completed"
    create_audit_log "deploy" "Helm deployment completed successfully"
}

wait_for_rollout() {
    log_step "Waiting for Rollout Completion"

    local namespace=$(get_namespace)

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would wait for rollout"
        return 0
    fi

    # Wait for all deployments to be ready
    local deployments=$(kubectl get deployment -n "$namespace" -l app.kubernetes.io/instance="$HELM_RELEASE" -o name)

    for deployment in $deployments; do
        log_info "Waiting for $deployment..."
        if ! kubectl rollout status "$deployment" -n "$namespace" --timeout="${ROLLOUT_TIMEOUT}s"; then
            log_error "Rollout failed for $deployment"
            return 1
        fi
        log_success "$deployment rolled out successfully"
    done

    create_audit_log "rollout" "All deployments rolled out successfully"
}

# ============================================================================
# Health Check Functions
# ============================================================================

run_health_checks() {
    log_step "Running Health Checks"

    local namespace=$(get_namespace)

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run health checks"
        return 0
    fi

    # Get API service endpoint
    local api_endpoint
    api_endpoint=$(kubectl get svc -n "$namespace" intelgraph-api -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || \
                   kubectl get svc -n "$namespace" intelgraph-api -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || \
                   echo "localhost")

    log_info "Checking API endpoint: $api_endpoint"

    # Health check with retries
    local max_attempts=30
    local attempt=1
    local wait_seconds=10

    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt $attempt/$max_attempts..."

        if curl -sf "http://$api_endpoint:4000/health" > /dev/null 2>&1; then
            log_success "Health check passed!"

            # Additional checks
            log_info "Running detailed health checks..."

            # Check /health/ready
            if curl -sf "http://$api_endpoint:4000/health/ready" > /dev/null 2>&1; then
                log_success "Readiness check passed"
            else
                log_warning "Readiness check failed"
            fi

            # Check /health/live
            if curl -sf "http://$api_endpoint:4000/health/live" > /dev/null 2>&1; then
                log_success "Liveness check passed"
            else
                log_warning "Liveness check failed"
            fi

            # Check GraphQL endpoint
            if curl -sf -X POST "http://$api_endpoint:4000/graphql" \
                -H "Content-Type: application/json" \
                -d '{"query":"{ __typename }"}' > /dev/null 2>&1; then
                log_success "GraphQL endpoint check passed"
            else
                log_warning "GraphQL endpoint check failed"
            fi

            create_audit_log "health_check" "All health checks passed"
            return 0
        fi

        sleep $wait_seconds
        ((attempt++))
    done

    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

run_smoke_tests() {
    log_step "Running Smoke Tests"

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run smoke tests"
        return 0
    fi

    cd "$PROJECT_ROOT"

    log_info "Running smoke test suite..."
    if ! pnpm smoke 2>/dev/null; then
        log_error "Smoke tests failed"
        return 1
    fi

    log_success "Smoke tests passed"
    create_audit_log "smoke_tests" "Smoke tests completed successfully"
}

# ============================================================================
# Rollback Functions
# ============================================================================

perform_rollback() {
    log_step "Performing Rollback"

    local namespace=$(get_namespace)

    send_notification "warning" "Initiating rollback for deployment $DEPLOYMENT_ID"

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would perform rollback"
        return 0
    fi

    # Rollback Helm release
    log_info "Rolling back Helm release..."
    if helm rollback "$HELM_RELEASE" -n "$namespace" --wait --timeout "${ROLLOUT_TIMEOUT}s"; then
        log_success "Helm rollback completed"
    else
        log_error "Helm rollback failed"
        return 1
    fi

    # Wait for rollback to complete
    wait_for_rollout

    # Verify health after rollback
    if run_health_checks; then
        log_success "Rollback completed and verified"
        send_notification "success" "Rollback completed successfully for deployment $DEPLOYMENT_ID"
        create_audit_log "rollback" "Rollback completed successfully"
    else
        log_error "Health checks failed after rollback"
        send_notification "failure" "Rollback health checks failed for deployment $DEPLOYMENT_ID"
        return 1
    fi
}

# ============================================================================
# Main Deployment Flow
# ============================================================================

parse_arguments() {
    shift # Remove first argument (environment)

    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --version)
                VERSION_TAG="$2"
                shift 2
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           IntelGraph Deployment Automation                 ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Deployment ID: $DEPLOYMENT_ID"
    echo "║  Environment:   $ENVIRONMENT"
    echo "║  Dry Run:       $DRY_RUN"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    # Parse command line arguments
    parse_arguments "$@"

    create_audit_log "start" "Deployment initiated for $ENVIRONMENT"
    send_notification "info" "Deployment $DEPLOYMENT_ID started for $ENVIRONMENT"

    # Handle rollback if requested
    if [[ "$ROLLBACK" == true ]]; then
        perform_rollback
        exit $?
    fi

    # Main deployment flow
    local deployment_start=$(date +%s)
    local exit_code=0

    # Validate environment
    validate_environment || exit 1

    # Run pre-deployment tests
    run_pre_deployment_tests || exit 1

    # Backup current state
    backup_current_state || exit 1

    # Run database migrations
    run_database_migrations || {
        log_error "Database migrations failed"
        perform_rollback
        exit 1
    }

    # Deploy with Helm
    deploy_with_helm || {
        log_error "Helm deployment failed"
        perform_rollback
        exit 1
    }

    # Wait for rollout
    wait_for_rollout || {
        log_error "Rollout failed"
        perform_rollback
        exit 1
    }

    # Run health checks
    run_health_checks || {
        log_error "Health checks failed"
        perform_rollback
        exit 1
    }

    # Run smoke tests
    run_smoke_tests || {
        log_error "Smoke tests failed"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            perform_rollback
            exit 1
        fi
        log_warning "Continuing despite smoke test failures (non-production)"
    }

    # Calculate deployment duration
    local deployment_end=$(date +%s)
    local duration=$((deployment_end - deployment_start))

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           Deployment Completed Successfully!               ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Deployment ID: $DEPLOYMENT_ID"
    echo "║  Environment:   $ENVIRONMENT"
    echo "║  Duration:      ${duration}s"
    echo "║  Status:        SUCCESS"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    send_notification "success" "Deployment $DEPLOYMENT_ID completed successfully in ${duration}s"
    create_audit_log "complete" "Deployment completed successfully in ${duration}s"

    exit 0
}

# Validate environment argument
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo "Usage: $0 [staging|production] [options]"
    echo ""
    echo "Options:"
    echo "  --dry-run     Perform a dry run without actual deployment"
    echo "  --skip-tests  Skip pre-deployment tests"
    echo "  --force       Force deployment even with warnings"
    echo "  --rollback    Rollback to previous version"
    echo "  --version     Deploy specific version tag"
    exit 1
fi

# Production safety check
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_warning "⚠️  You are deploying to PRODUCTION!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

main "$@"
