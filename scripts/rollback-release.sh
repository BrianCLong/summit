#!/bin/bash

# Summit GA - Deterministic Release Rollback Script
# Version: 2.0
# Usage: ./scripts/rollback-release.sh --version <TARGET_VERSION> --reason "<REASON>"

set -euo pipefail

# --- Configuration ---
NAMESPACE="${NAMESPACE:-production}"
RELEASE_NAME="${RELEASE_NAME:-summit-prod}"
CHART_PATH="${CHART_PATH:-./helm/summit}"
ROLLBACK_TIMEOUT="5m"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}" # Set via environment variable

# --- Colors for Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Logging Functions ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Help Function ---
show_help() {
    cat << EOF
Usage: ./scripts/rollback-release.sh --version <TARGET_VERSION> --reason "<REASON>" [options]

Required:
    --version VERSION        The GA version to roll back to (e.g., 'v2026.01.14-ga'). The script will find the corresponding Helm revision.
    --reason REASON          The reason for the rollback (e.g., 'Critical performance degradation').

Options:
    --dry-run                Show what would happen without executing.
    --notify                 Send a notification to Slack (requires SLACK_WEBHOOK_URL).
    --help                   Show this help message.
EOF
}

# --- Argument Parsing ---
TARGET_VERSION=""
ROLLBACK_REASON=""
DRY_RUN=false
NOTIFY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --version) TARGET_VERSION="$2"; shift 2;;
        --reason) ROLLBACK_REASON="$2"; shift 2;;
        --dry-run) DRY_RUN=true; shift;;
        --notify) NOTIFY=true; shift;;
        --help) show_help; exit 0;;
        *) log_error "Unknown option: $1"; show_help; exit 1;;
    esac
done

if [[ -z "$TARGET_VERSION" || -z "$ROLLBACK_REASON" ]]; then
    log_error "Missing required arguments: --version and --reason."
    show_help
    exit 1
fi

# --- Functions ---

send_notification() {
    if [[ "$NOTIFY" = false || -z "$SLACK_WEBHOOK_URL" ]]; then return 0; fi

    local message="$1"
    local color="${2:-#FF0000}" # Red for rollback
    local user
    user=$(whoami)@$(hostname)

    local payload
    payload=$(cat <<EOF
{
    "attachments": [{
        "color": "$color",
        "title": "🚨 Summit GA Release Rollback Initiated",
        "fields": [
            {"title": "Target Version", "value": "$TARGET_VERSION", "short": true},
            {"title": "Initiated By", "value": "$user", "short": true},
            {"title": "Reason", "value": "$ROLLBACK_REASON", "short": false},
            {"title": "Status", "value": "$message", "short": false}
        ],
        "ts": $(date +%s)
    }]
}
EOF
)

    log_info "Sending Slack notification..."
    curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK_URL" || log_warning "Failed to send Slack notification."
}

# 1. Rollback Application Version
rollback_application() {
    log_info "Step 1: Rolling back application and configuration to version $TARGET_VERSION..."

    # Find the Helm revision that corresponds to the target application version.
    log_info "Searching for revision matching version '$TARGET_VERSION' in Helm history for release '$RELEASE_NAME'..."
    local target_revision
    target_revision=$(helm history "$RELEASE_NAME" -n "$NAMESPACE" -o json | jq -r --arg TV "$TARGET_VERSION" '.[] | select(.app_version == $TV) | .revision' | head -n 1)

    if [[ -z "$target_revision" ]]; then
        log_error "Could not find a Helm revision for version '$TARGET_VERSION'. Aborting."
        return 1
    fi

    log_success "Found Helm revision '$target_revision' for version '$TARGET_VERSION'."

    if [[ "$DRY_RUN" = true ]]; then
        log_warning "[DRY RUN] Would roll back Helm release '$RELEASE_NAME' to revision '$target_revision'."
        return 0
    fi

    log_info "Rolling back Helm release to revision '$target_revision'..."
    helm rollback "$RELEASE_NAME" "$target_revision" -n "$NAMESPACE" --wait --timeout="$ROLLBACK_TIMEOUT"

    log_info "Verifying application rollout status..."
    kubectl rollout status deployment/summit-server -n "$NAMESPACE" --timeout="$ROLLBACK_TIMEOUT"
    log_success "Application and configuration rollback complete."
}

# 2. Rollback Policy and Rate-Limit Baselines
rollback_policies() {
    log_info "Step 2: Rolling back OPA policy bundle..."

    # This assumes policies are versioned and bundled with the release tag.
    local bundle_version="$TARGET_VERSION"

    if [[ "$DRY_RUN" = true ]]; then
        log_warning "[DRY RUN] Would roll back OPA policy bundle to version '$bundle_version'."
        return 0
    fi

    log_info "Updating OPA deployment to use policy bundle version: $bundle_version"
    kubectl set env deployment/opa -n governance BUNDLE_VERSION="$bundle_version"
    kubectl rollout restart deployment/opa -n governance
    kubectl rollout status deployment/opa -n governance --timeout="$ROLLBACK_TIMEOUT"

    log_success "Policy and rate-limit baselines restored."
}

# 3. Post-Rollback Verification
verify_rollback() {
    log_info "Step 3: Verifying rollback..."

    if [[ "$DRY_RUN" = true ]]; then
        log_warning "[DRY RUN] Would perform post-rollback verification."
        return 0
    fi

    # Verify application version
    local image
    image=$(kubectl get deployment/summit-server -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    log_info "Current server image: $image"

    if ! echo "$image" | grep -q "$TARGET_VERSION"; then
        log_warning "Image version does not match target version. Expected '$TARGET_VERSION', found in '$image'."
    else
        log_success "Application version verified."
    fi

    # Verify health check
    local health
    health=$(curl -s -o /dev/null -w "%{http_code}" "https://api.summit.internal/health")
    if [[ "$health" -ne 200 ]]; then
        log_error "Health check failed with status code: $health"
        return 1
    fi
    log_success "Health check passed."
}

# --- Main Execution ---
main() {
    log_info "Starting Summit GA release rollback..."
    log_info "Target Version: $TARGET_VERSION"
    log_info "Reason: $ROLLBACK_REASON"

    send_notification "Rollback initiated"

    if ! rollback_application; then
        send_notification "Rollback FAILED during application rollback." "#FF0000"
        exit 1
    fi

    rollback_policies
    verify_rollback

    if [[ "$DRY_RUN" = true ]]; then
        log_warning "[DRY RUN] Rollback simulation complete."
    else
        log_success "Rollback to version $TARGET_VERSION complete."
        send_notification "Rollback successful" "#00FF00" # Green
    fi
}

main "$@"
