#!/bin/bash
set -euo pipefail

# Air-Gap Sync CLI Tool
# Provides operator commands for creating, verifying, and applying sync bundles

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE_DIR="${BUNDLE_DIR:-/opt/intelgraph/bundles}"
SYNC_SERVICE_URL="${SYNC_SERVICE_URL:-http://localhost:4020}"
CLASSIFICATION="${CLASSIFICATION:-UNCLASSIFIED}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

check_requirements() {
    local missing=0

    for cmd in curl jq; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            missing=1
        fi
    done

    if [ $missing -eq 1 ]; then
        log_error "Please install missing dependencies"
        exit 1
    fi
}

check_sync_service() {
    if ! curl -sf "${SYNC_SERVICE_URL}/health" > /dev/null; then
        log_error "Sync service not reachable at ${SYNC_SERVICE_URL}"
        log_info "Check that the sync service is running: kubectl get pods -l app=sync-service"
        exit 1
    fi
}

# ==============================================================================
# Export Command
# ==============================================================================

cmd_export() {
    local scope_json="$1"
    local direction="${2:-push_up}"
    local requester="${3:-operator@$(hostname)}"
    local reason="${4:-Manual export via CLI}"
    local dry_run="${5:-false}"

    log_info "Creating export bundle..."
    log_info "Direction: $direction"
    log_info "Requester: $requester"
    log_info "Dry run: $dry_run"

    local request_body
    request_body=$(cat <<EOF
{
  "scope": $scope_json,
  "direction": "$direction",
  "requester": "$requester",
  "reason": "$reason",
  "dryRun": $dry_run,
  "encrypt": false,
  "expiresIn": 86400
}
EOF
    )

    local response
    if ! response=$(curl -sf -X POST \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        "${SYNC_SERVICE_URL}/export"); then
        log_error "Export request failed"
        echo "$response" | jq '.' || echo "$response"
        exit 1
    fi

    local bundle_id
    bundle_id=$(echo "$response" | jq -r '.bundleId')

    log_success "Export completed successfully"
    echo "$response" | jq '.'

    if [ "$dry_run" = "false" ]; then
        log_info "Bundle ID: $bundle_id"
        log_info "Bundle path: $(echo "$response" | jq -r '.bundlePath')"
        log_info ""
        log_info "Next steps:"
        log_info "  1. Verify the bundle: $0 verify $bundle_id"
        log_info "  2. Package for transfer: $0 package $bundle_id"
    fi
}

# ==============================================================================
# Import Command
# ==============================================================================

cmd_import() {
    local bundle_path="$1"
    local conflict_resolution="${2:-abort}"
    local requester="${3:-operator@$(hostname)}"
    local reason="${4:-Manual import via CLI}"
    local dry_run="${5:-false}"
    local verify_sigs="${6:-true}"

    log_info "Importing bundle from: $bundle_path"
    log_info "Conflict resolution: $conflict_resolution"
    log_info "Verify signatures: $verify_sigs"
    log_info "Dry run: $dry_run"

    if [ ! -f "$bundle_path" ]; then
        log_error "Bundle file not found: $bundle_path"
        exit 1
    fi

    local request_body
    request_body=$(cat <<EOF
{
  "bundlePath": "$bundle_path",
  "conflictResolution": "$conflict_resolution",
  "requester": "$requester",
  "reason": "$reason",
  "dryRun": $dry_run,
  "verifySignatures": $verify_sigs
}
EOF
    )

    local response
    if ! response=$(curl -sf -X POST \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        "${SYNC_SERVICE_URL}/import"); then
        log_error "Import request failed"
        echo "$response" | jq '.' || echo "$response"
        exit 1
    fi

    log_success "Import completed"
    echo "$response" | jq '.'

    local success
    success=$(echo "$response" | jq -r '.success')
    local conflicts_count
    conflicts_count=$(echo "$response" | jq -r '.statistics.conflicts')

    if [ "$success" = "true" ]; then
        log_success "Import successful"
        if [ "$conflicts_count" != "0" ]; then
            log_warn "Encountered $conflicts_count conflicts during import"
            log_info "View conflicts: $0 conflicts"
        fi
    else
        log_error "Import failed"
        exit 1
    fi
}

# ==============================================================================
# Verify Command
# ==============================================================================

cmd_verify() {
    local bundle_path="$1"

    log_info "Verifying bundle: $bundle_path"

    if [ ! -f "$bundle_path" ]; then
        log_error "Bundle file not found: $bundle_path"
        exit 1
    fi

    local response
    if ! response=$(curl -sf -X POST \
        -H "Content-Type: application/json" \
        -d "{\"bundlePath\": \"$bundle_path\"}" \
        "${SYNC_SERVICE_URL}/verify"); then
        log_error "Verification request failed"
        echo "$response" | jq '.' || echo "$response"
        exit 1
    fi

    echo "$response" | jq '.'

    local valid
    valid=$(echo "$response" | jq -r '.valid')

    if [ "$valid" = "true" ]; then
        log_success "✅ Bundle verification PASSED"
        log_info "Checksum: $(echo "$response" | jq -r '.checksumValid')"
        log_info "Signatures: $(echo "$response" | jq -r '.signaturesValid')"
        log_info "Not expired: $(echo "$response" | jq -r '.notExpired')"
        return 0
    else
        log_error "❌ Bundle verification FAILED"
        log_error "Errors:"
        echo "$response" | jq -r '.errors[]' | while read -r err; do
            log_error "  - $err"
        done
        return 1
    fi
}

# ==============================================================================
# List Bundles Command
# ==============================================================================

cmd_list() {
    log_info "Listing available bundles..."

    local response
    if ! response=$(curl -sf "${SYNC_SERVICE_URL}/bundles"); then
        log_error "Failed to retrieve bundle list"
        exit 1
    fi

    local total
    total=$(echo "$response" | jq -r '.total')

    log_info "Found $total bundles"
    echo ""

    echo "$response" | jq -r '.bundles[] |
        "ID: \(.bundleId)\n" +
        "  Direction: \(.direction)\n" +
        "  Source: \(.sourceDeployment)\n" +
        "  Created: \(.createdAt)\n" +
        "  Created By: \(.createdBy)\n" +
        "  Expires: \(.expiresAt)\n" +
        "  Path: \(.path)\n"'
}

# ==============================================================================
# Package Command (for physical transfer)
# ==============================================================================

cmd_package() {
    local bundle_id="$1"
    local output_dir="${2:-/tmp/bundle-packages}"

    log_info "Packaging bundle $bundle_id for physical transfer..."

    mkdir -p "$output_dir"

    local bundle_file="${BUNDLE_DIR}/${bundle_id}.json"
    if [ ! -f "$bundle_file" ]; then
        log_error "Bundle file not found: $bundle_file"
        exit 1
    fi

    local package_dir="${output_dir}/${bundle_id}"
    mkdir -p "$package_dir"

    # Copy bundle
    cp "$bundle_file" "$package_dir/bundle.json"

    # Generate checksums
    (
        cd "$package_dir"
        sha256sum bundle.json > bundle.json.sha256
    )

    # Create README
    cat > "$package_dir/README.txt" <<EOF
Air-Gap Sync Bundle Package
============================

Bundle ID: $bundle_id
Created: $(date -Iseconds)
Classification: $CLASSIFICATION

Contents:
  - bundle.json         - The sync bundle data
  - bundle.json.sha256  - SHA-256 checksum for verification
  - README.txt          - This file

Transfer Instructions:
1. Verify checksum integrity:
   sha256sum -c bundle.json.sha256

2. Transfer this entire directory to the target deployment using
   approved physical media (USB, DVD, tape, etc.)

3. On target system, verify again:
   sha256sum -c bundle.json.sha256

4. Import bundle:
   sync-cli.sh import ./bundle.json [conflict-resolution]

Security Notes:
- This bundle is classified as: $CLASSIFICATION
- Handle according to your organization's data handling procedures
- Maintain chain of custody documentation
- Log all transfers in your audit system

For support, contact your system administrator.
EOF

    # Create tarball
    local tarball="${output_dir}/${bundle_id}.tar.gz"
    tar -czf "$tarball" -C "$output_dir" "$bundle_id"

    # Generate tarball checksum
    (
        cd "$output_dir"
        sha256sum "$(basename "$tarball")" > "${bundle_id}.tar.gz.sha256"
    )

    log_success "Bundle packaged successfully"
    log_info "Package directory: $package_dir"
    log_info "Tarball: $tarball"
    log_info "Checksum: ${tarball}.sha256"
    log_info ""
    log_info "Transfer package:"
    log_info "  1. Copy tarball and checksum to transfer media"
    log_info "  2. On target: sha256sum -c ${bundle_id}.tar.gz.sha256"
    log_info "  3. On target: tar -xzf ${bundle_id}.tar.gz"
    log_info "  4. On target: cd ${bundle_id} && sync-cli.sh import ./bundle.json"
}

# ==============================================================================
# Audit Log Command
# ==============================================================================

cmd_audit() {
    log_info "Retrieving sync audit log..."

    local response
    if ! response=$(curl -sf "${SYNC_SERVICE_URL}/audit-log"); then
        log_error "Failed to retrieve audit log"
        exit 1
    fi

    echo "$response" | jq -r '.records[] |
        "[\(.timestamp)] \(.operation | ascii_upcase) - \(.bundle_id)\n" +
        "  Actor: \(.actor)\n" +
        "  Source: \(.source_deployment)\n" +
        "  Target: \(.target_deployment // "N/A")\n" +
        "  Result: \(.result | ascii_upcase)\n" +
        "  Classification: \(.classification)\n"'
}

# ==============================================================================
# Conflicts Command
# ==============================================================================

cmd_conflicts() {
    log_info "Retrieving unresolved conflicts..."

    local response
    if ! response=$(curl -sf "${SYNC_SERVICE_URL}/conflicts"); then
        log_error "Failed to retrieve conflicts"
        exit 1
    fi

    local total
    total=$(echo "$response" | jq -r '.total')

    if [ "$total" -eq 0 ]; then
        log_success "No unresolved conflicts"
        return 0
    fi

    log_warn "Found $total unresolved conflicts"
    echo ""

    echo "$response" | jq -r '.conflicts[] |
        "ID: \(.id)\n" +
        "  Bundle: \(.bundle_id)\n" +
        "  Type: \(.type)\n" +
        "  Resource: \(.resource_type) / \(.resource_id)\n" +
        "  Detected: \(.detected_at)\n"'
}

# ==============================================================================
# Interactive Export Wizard
# ==============================================================================

cmd_export_wizard() {
    log_info "🧙 Interactive Export Wizard"
    echo ""

    # Get scope type
    echo "Select export scope:"
    echo "  1) Specific cases"
    echo "  2) Time range"
    echo "  3) Specific tenants"
    read -p "Choice [1-3]: " scope_choice

    local scope_json=""

    case $scope_choice in
        1)
            read -p "Enter case IDs (comma-separated): " case_ids
            IFS=',' read -ra CASE_ARRAY <<< "$case_ids"
            scope_json=$(jq -n --argjson cases "$(printf '%s\n' "${CASE_ARRAY[@]}" | jq -R . | jq -s .)" \
                '{cases: $cases, includeEvidence: true, includeAnalytics: false}')
            ;;
        2)
            read -p "Start date (YYYY-MM-DD): " start_date
            read -p "End date (YYYY-MM-DD): " end_date
            scope_json=$(jq -n \
                --arg start "${start_date}T00:00:00Z" \
                --arg end "${end_date}T23:59:59Z" \
                '{timeRange: {start: $start, end: $end}, includeEvidence: true, includeAnalytics: false}')
            ;;
        3)
            read -p "Enter tenant IDs (comma-separated): " tenant_ids
            IFS=',' read -ra TENANT_ARRAY <<< "$tenant_ids"
            scope_json=$(jq -n --argjson tenants "$(printf '%s\n' "${TENANT_ARRAY[@]}" | jq -R . | jq -s .)" \
                '{tenants: $tenants, includeEvidence: true, includeAnalytics: false}')
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac

    # Get direction
    echo ""
    echo "Select sync direction:"
    echo "  1) Push up (edge → core)"
    echo "  2) Pull down (core → edge)"
    read -p "Choice [1-2]: " direction_choice

    local direction="push_up"
    case $direction_choice in
        1) direction="push_up" ;;
        2) direction="pull_down" ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac

    # Get metadata
    echo ""
    read -p "Your name/ID: " requester
    read -p "Reason for export: " reason

    # Dry run option
    echo ""
    read -p "Perform dry run first? [Y/n]: " dry_run_choice
    local dry_run="true"
    if [[ "$dry_run_choice" =~ ^[Nn] ]]; then
        dry_run="false"
    fi

    echo ""
    log_info "Export configuration:"
    log_info "  Scope: $scope_json"
    log_info "  Direction: $direction"
    log_info "  Requester: $requester"
    log_info "  Reason: $reason"
    log_info "  Dry run: $dry_run"
    echo ""
    read -p "Proceed? [Y/n]: " confirm

    if [[ "$confirm" =~ ^[Nn] ]]; then
        log_warn "Export cancelled"
        exit 0
    fi

    cmd_export "$scope_json" "$direction" "$requester" "$reason" "$dry_run"
}

# ==============================================================================
# Main Command Dispatcher
# ==============================================================================

usage() {
    cat <<EOF
Air-Gap Sync CLI - Manage sync bundles for air-gapped deployments

Usage: $0 <command> [options]

Commands:
  export <scope-json> [direction] [requester] [reason] [dry-run]
      Create an export bundle
      Example: $0 export '{"cases":["case-123"]}' push_up operator "Sync to core"

  export-wizard
      Interactive export wizard

  import <bundle-path> [conflict-resolution] [requester] [reason] [dry-run]
      Import a bundle
      Conflict resolution: abort (default), skip, overwrite, merge
      Example: $0 import /path/to/bundle.json skip

  verify <bundle-path>
      Verify bundle integrity and signatures
      Example: $0 verify /path/to/bundle.json

  list
      List all available bundles

  package <bundle-id> [output-dir]
      Package bundle for physical transfer
      Example: $0 package bundle_abc123 /tmp/packages

  audit
      View sync audit log

  conflicts
      View unresolved conflicts

  help
      Show this help message

Environment Variables:
  SYNC_SERVICE_URL    - Sync service URL (default: http://localhost:4020)
  BUNDLE_DIR          - Bundle storage directory (default: /opt/intelgraph/bundles)
  CLASSIFICATION      - Data classification (default: UNCLASSIFIED)

Examples:
  # Export cases from last week
  $0 export '{"timeRange":{"start":"2025-01-01T00:00:00Z","end":"2025-01-07T23:59:59Z"}}'

  # Import with conflict resolution
  $0 import /mnt/usb/bundle_abc123.json merge operator "Merge from field"

  # Verify before import
  $0 verify /mnt/usb/bundle_abc123.json && $0 import /mnt/usb/bundle_abc123.json

  # Package for transfer
  $0 package bundle_abc123 /mnt/usb/exports

EOF
}

main() {
    if [ $# -eq 0 ]; then
        usage
        exit 0
    fi

    check_requirements

    local command="$1"
    shift

    case "$command" in
        export)
            check_sync_service
            cmd_export "$@"
            ;;
        export-wizard)
            check_sync_service
            cmd_export_wizard
            ;;
        import)
            check_sync_service
            cmd_import "$@"
            ;;
        verify)
            check_sync_service
            cmd_verify "$@"
            ;;
        list)
            check_sync_service
            cmd_list
            ;;
        package)
            cmd_package "$@"
            ;;
        audit)
            check_sync_service
            cmd_audit
            ;;
        conflicts)
            check_sync_service
            cmd_conflicts
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            log_error "Unknown command: $command"
            echo ""
            usage
            exit 1
            ;;
    esac
}

main "$@"
