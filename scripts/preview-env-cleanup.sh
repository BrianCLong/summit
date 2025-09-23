#!/bin/bash
# Preview Environment Cleanup Script
# Removes inactive preview environments after specified time

set -euo pipefail

# Configuration
NAMESPACE_PREFIX="intelgraph-pr"
INACTIVE_HOURS=${1:-48}
DRY_RUN=${DRY_RUN:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS] [INACTIVE_HOURS]

Cleanup inactive preview environments

Options:
    --dry-run           Show what would be cleaned up without actually doing it
    --inactive-hours N  Clean up environments inactive for N hours (default: 48)
    --help             Show this help message

Environment Variables:
    DRY_RUN=true       Same as --dry-run flag

Examples:
    $0                                    # Clean up environments inactive for 48+ hours
    $0 24                                # Clean up environments inactive for 24+ hours
    $0 --dry-run 72                     # Show what would be cleaned for 72+ hour inactive
    DRY_RUN=true $0                     # Dry run with default 48 hours

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --inactive-hours)
            INACTIVE_HOURS="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        -*)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            INACTIVE_HOURS="$1"
            shift
            ;;
    esac
done

# Validation
if ! [[ "$INACTIVE_HOURS" =~ ^[0-9]+$ ]]; then
    error "INACTIVE_HOURS must be a positive integer, got: $INACTIVE_HOURS"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    error "kubectl is required but not installed"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    error "helm is required but not installed"
    exit 1
fi

log "🧹 Preview Environment Cleanup Starting"
log "Inactive threshold: ${INACTIVE_HOURS} hours"
log "Dry run mode: ${DRY_RUN}"
log "Namespace prefix: ${NAMESPACE_PREFIX}"

# Calculate cutoff timestamp
CUTOFF_TIMESTAMP=$(date -u -d "${INACTIVE_HOURS} hours ago" '+%Y-%m-%dT%H:%M:%SZ')
log "Cutoff timestamp: ${CUTOFF_TIMESTAMP}"

# Find preview namespaces
log "🔍 Finding preview environments..."
PREVIEW_NAMESPACES=$(kubectl get namespaces -o json | \
    jq -r --arg prefix "${NAMESPACE_PREFIX}" \
    '.items[] | select(.metadata.name | startswith($prefix)) | .metadata.name')

if [[ -z "$PREVIEW_NAMESPACES" ]]; then
    log "No preview environments found"
    exit 0
fi

TOTAL_FOUND=$(echo "$PREVIEW_NAMESPACES" | wc -l)
log "Found ${TOTAL_FOUND} preview environment(s)"

CLEANED_COUNT=0
SKIPPED_COUNT=0

# Process each namespace
for NAMESPACE in $PREVIEW_NAMESPACES; do
    log "🔍 Checking namespace: ${NAMESPACE}"

    # Extract PR number from namespace
    PR_NUMBER=$(echo "$NAMESPACE" | sed "s/${NAMESPACE_PREFIX}-//")

    # Get namespace creation time
    CREATION_TIME=$(kubectl get namespace "$NAMESPACE" -o jsonpath='{.metadata.creationTimestamp}')

    # Check if namespace is older than threshold
    if [[ "$CREATION_TIME" < "$CUTOFF_TIMESTAMP" ]]; then
        warn "Namespace ${NAMESPACE} is inactive (created: ${CREATION_TIME})"

        # Check if corresponding PR is still open
        if command -v gh &> /dev/null; then
            if gh pr view "$PR_NUMBER" --json state &> /dev/null; then
                PR_STATE=$(gh pr view "$PR_NUMBER" --json state --jq '.state')
                if [[ "$PR_STATE" == "OPEN" ]]; then
                    log "PR #${PR_NUMBER} is still open, skipping cleanup"
                    ((SKIPPED_COUNT++))
                    continue
                fi
            fi
        fi

        if [[ "$DRY_RUN" == "true" ]]; then
            log "🎯 [DRY RUN] Would clean up: ${NAMESPACE} (PR #${PR_NUMBER})"
        else
            log "🧹 Cleaning up: ${NAMESPACE} (PR #${PR_NUMBER})"

            # Remove Helm release
            log "  Removing Helm release: intelgraph-pr-${PR_NUMBER}"
            if helm uninstall "intelgraph-pr-${PR_NUMBER}" --namespace "$NAMESPACE" --ignore-not-found; then
                success "  Helm release removed"
            else
                error "  Failed to remove Helm release"
            fi

            # Delete namespace
            log "  Deleting namespace: ${NAMESPACE}"
            if kubectl delete namespace "$NAMESPACE" --ignore-not-found --timeout=300s; then
                success "  Namespace deleted"
            else
                error "  Failed to delete namespace"
            fi

            # Clean up container images if GitHub CLI is available
            if command -v gh &> /dev/null && [[ -n "${GITHUB_TOKEN:-}" ]]; then
                log "  Cleaning up container images for PR #${PR_NUMBER}"

                # Delete server image
                gh api --method DELETE \
                    "/orgs/${GITHUB_REPOSITORY_OWNER}/packages/container/${GITHUB_REPOSITORY}%2Fserver/versions" \
                    --field "tag=pr-${PR_NUMBER}" 2>/dev/null || true

                # Delete client image
                gh api --method DELETE \
                    "/orgs/${GITHUB_REPOSITORY_OWNER}/packages/container/${GITHUB_REPOSITORY}%2Fclient/versions" \
                    --field "tag=pr-${PR_NUMBER}" 2>/dev/null || true

                success "  Container images cleaned up"
            else
                warn "  Skipping container image cleanup (gh CLI or GITHUB_TOKEN not available)"
            fi
        fi

        ((CLEANED_COUNT++))
    else
        log "Namespace ${NAMESPACE} is still active (created: ${CREATION_TIME})"
        ((SKIPPED_COUNT++))
    fi
done

# Summary
log "📊 Cleanup Summary:"
log "  Total environments found: ${TOTAL_FOUND}"
log "  Environments cleaned: ${CLEANED_COUNT}"
log "  Environments skipped: ${SKIPPED_COUNT}"

if [[ "$DRY_RUN" == "true" ]]; then
    log "🎯 This was a dry run. No actual cleanup was performed."
    log "Run without --dry-run to execute the cleanup."
fi

if [[ $CLEANED_COUNT -gt 0 ]]; then
    success "🧹 Preview environment cleanup completed successfully"
else
    log "✨ No cleanup needed - all environments are active"
fi