#!/bin/bash

# Maestro Conductor v24.2.0 - Blue/Green Rollback Script
# Epic E10: Emergency rollback capabilities

set -euo pipefail

ENVIRONMENT="${1:-staging}"
TARGET_ENV="${2:-blue}"
NAMESPACE="intelgraph-${ENVIRONMENT}"
RELEASE_NAME="maestro"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[ROLLBACK]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[ROLLBACK SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ROLLBACK ERROR]${NC} $1"
}

log_info "🔄 Initiating emergency rollback to $TARGET_ENV environment"

# Verify target environment exists
if ! kubectl get deployment "${RELEASE_NAME}-${TARGET_ENV}" -n "$NAMESPACE" &>/dev/null; then
    log_error "Target environment $TARGET_ENV does not exist"
    exit 1
fi

# Check target environment health
log_info "Verifying target environment health..."
kubectl wait deployment "${RELEASE_NAME}-${TARGET_ENV}" \
    --namespace "$NAMESPACE" \
    --for=condition=Available \
    --timeout=60s

# Switch service to target environment
log_info "Switching traffic to $TARGET_ENV environment..."
kubectl patch service "${RELEASE_NAME}-service" \
    --namespace "$NAMESPACE" \
    --type='merge' \
    --patch="{\"spec\":{\"selector\":{\"environment\":\"$TARGET_ENV\"}}}"

# Verify rollback
sleep 5
CURRENT_SELECTOR=$(kubectl get service "${RELEASE_NAME}-service" \
    -n "$NAMESPACE" \
    -o jsonpath='{.spec.selector.environment}')

if [[ "$CURRENT_SELECTOR" == "$TARGET_ENV" ]]; then
    log_success "Rollback completed successfully"
    log_info "Service now pointing to: $TARGET_ENV"
else
    log_error "Rollback verification failed"
    exit 1
fi