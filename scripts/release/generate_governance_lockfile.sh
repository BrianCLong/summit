#!/usr/bin/env bash
# generate_governance_lockfile.sh
# Generates a cryptographic snapshot of all governance policies and state flags
#
# Creates a deterministic, verifiable record of the exact governance configuration
# in effect at release time. This enables audit-grade traceability between
# operational behavior and policy configuration.
#
# Usage:
#   ./generate_governance_lockfile.sh --sha abc123 [--tag v4.1.2] [--out-dir ./governance]
#
# Outputs:
#   governance/snapshot/<relative paths>   - Copies of policy/state files
#   governance/governance_lockfile.json    - Manifest with hashes
#   governance/governance_SHA256SUMS       - Checksum file
#   governance/signatures/                 - Optional signatures
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Configuration
TAG=""
SHA=""
OUT_DIR=""
VERBOSE=false
SIGN=false

# Files to include in lockfile (relative to repo root)
# Policies
POLICY_FILES=(
    "docs/ci/REQUIRED_CHECKS_POLICY.yml"
    "docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml"
    "docs/ci/ERROR_BUDGET_POLICY.yml"
    "docs/ci/REDACTION_POLICY.yml"
    "docs/ci/PAGES_PUBLISH_ALLOWLIST.md"
    "docs/ci/REDACTION_TREND_ALERT_POLICY.yml"
    "docs/ci/RELEASE_OPS_SLO_POLICY.yml"
    "docs/ci/BLOCKER_ESCALATION_POLICY.yml"
    "docs/ci/ONCALL_HANDOFF_POLICY.yml"
    "docs/ci/TRIAGE_ROUTING_POLICY.yml"
    "docs/ci/REMEDIATION_PLAYBOOKS.yml"
    "docs/ci/TEST_QUARANTINE_POLICY.yml"
    "docs/ci/CHANGELOG_POLICY.yml"
    "docs/ci/DEPENDENCY_AUDIT_POLICY.yml"
    "docs/ci/TYPE_SAFETY_POLICY.yml"
    "docs/ci/API_DETERMINISM_POLICY.yml"
)

# State flags
STATE_FILES=(
    "docs/releases/_state/freeze_mode.json"
    "docs/releases/_state/release_override.json"
    "docs/releases/_state/governance_tight_mode.json"
    "docs/releases/_state/error_budget_state.json"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[INFO]${NC} $*" >&2
    fi
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

show_help() {
    cat << EOF
generate_governance_lockfile.sh v${SCRIPT_VERSION}

Generate a cryptographic snapshot of governance policies and state flags.

Usage:
  $(basename "$0") --sha SHA [options]

Options:
  --sha SHA           Commit SHA (required)
  --tag TAG           Release tag (optional, for metadata)
  --out-dir DIR       Output directory (default: governance/)
  --sign              Sign the SHA256SUMS file (requires cosign)
  --verbose           Enable verbose output
  --help              Show this help message

Outputs:
  governance/snapshot/          Policy and state file copies
  governance/governance_lockfile.json   Manifest with hashes
  governance/governance_SHA256SUMS      Checksums for verification

Examples:
  # Generate lockfile for current HEAD
  $(basename "$0") --sha \$(git rev-parse HEAD)

  # Generate for a specific tag
  $(basename "$0") --sha abc123 --tag v4.1.2 --out-dir ./bundle/governance
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --sha)
            SHA="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --out-dir)
            OUT_DIR="$2"
            shift 2
            ;;
        --sign)
            SIGN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 2
            ;;
    esac
done

# Validate required arguments
if [[ -z "$SHA" ]]; then
    log_error "Missing required argument: --sha"
    exit 2
fi

# Set default output directory
if [[ -z "$OUT_DIR" ]]; then
    OUT_DIR="governance"
fi

log_info "Generating governance lockfile..."
log_info "SHA: $SHA"
log_info "Tag: ${TAG:-'(none)'}"
log_info "Output: $OUT_DIR"

# Create output directories
mkdir -p "${OUT_DIR}/snapshot"

if [[ "$SIGN" == "true" ]]; then
    mkdir -p "${OUT_DIR}/signatures"
fi

# Timestamp for deterministic output
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Collect files
COLLECTED_FILES=()
MISSING_FILES=()

collect_file() {
    local rel_path="$1"
    local full_path="${REPO_ROOT}/${rel_path}"
    local snapshot_path="${OUT_DIR}/snapshot/${rel_path}"

    if [[ -f "$full_path" ]]; then
        # Create parent directory
        mkdir -p "$(dirname "$snapshot_path")"

        # Copy file to snapshot
        cp "$full_path" "$snapshot_path"

        COLLECTED_FILES+=("$rel_path")
        log_info "Collected: $rel_path"
    else
        MISSING_FILES+=("$rel_path")
        log_info "Skipped (not found): $rel_path"
    fi
}

log_info "Collecting policy files..."
for file in "${POLICY_FILES[@]}"; do
    collect_file "$file"
done

log_info "Collecting state files..."
for file in "${STATE_FILES[@]}"; do
    collect_file "$file"
done

# Sort collected files for determinism
IFS=$'\n' SORTED_FILES=($(sort <<< "${COLLECTED_FILES[*]}")); unset IFS

log_info "Collected ${#SORTED_FILES[@]} files"

# Generate file entries with hashes
FILE_ENTRIES=""
for file in "${SORTED_FILES[@]}"; do
    snapshot_file="${OUT_DIR}/snapshot/${file}"
    file_hash=$(sha256sum "$snapshot_file" | cut -d' ' -f1)
    file_size=$(wc -c < "$snapshot_file" | tr -d ' ')

    # Build JSON entry (one per line for stable output)
    if [[ -n "$FILE_ENTRIES" ]]; then
        FILE_ENTRIES+=","
    fi
    FILE_ENTRIES+="
    {
      \"path\": \"snapshot/${file}\",
      \"sha256\": \"${file_hash}\",
      \"bytes\": ${file_size}
    }"
done

# Generate lockfile JSON
log_info "Generating governance_lockfile.json..."

LOCKFILE_JSON="${OUT_DIR}/governance_lockfile.json"

cat > "$LOCKFILE_JSON" << EOF
{
  "version": "1.0",
  "schema_version": "1.0.0",
  "tag": $(if [[ -n "$TAG" ]]; then echo "\"$TAG\""; else echo "null"; fi),
  "sha": "${SHA}",
  "generated_at_utc": "${TIMESTAMP}",
  "generator": "generate_governance_lockfile.sh v${SCRIPT_VERSION}",
  "summary": {
    "total_files": ${#SORTED_FILES[@]},
    "policy_files": $(echo "${COLLECTED_FILES[@]}" | tr ' ' '\n' | grep -c "docs/ci/" || echo 0),
    "state_files": $(echo "${COLLECTED_FILES[@]}" | tr ' ' '\n' | grep -c "_state/" || echo 0),
    "missing_files": ${#MISSING_FILES[@]}
  },
  "files": [${FILE_ENTRIES}
  ]
}
EOF

# Sort JSON keys for determinism if jq available
if command -v jq > /dev/null 2>&1; then
    jq -S '.' "$LOCKFILE_JSON" > "${LOCKFILE_JSON}.tmp" && mv "${LOCKFILE_JSON}.tmp" "$LOCKFILE_JSON"
fi

# Generate SHA256SUMS for the governance directory
log_info "Generating governance_SHA256SUMS..."

SUMS_FILE="${OUT_DIR}/governance_SHA256SUMS"

# Generate checksums for all files in the governance directory
cd "$OUT_DIR"
{
    # First the lockfile itself
    sha256sum governance_lockfile.json

    # Then all snapshot files (sorted for determinism)
    find snapshot -type f | sort | while read -r file; do
        sha256sum "$file"
    done
} > governance_SHA256SUMS
cd - > /dev/null

# Optional signing
if [[ "$SIGN" == "true" ]]; then
    if command -v cosign > /dev/null 2>&1; then
        log_info "Signing governance_SHA256SUMS with cosign..."
        cosign sign-blob \
            --yes \
            --output-signature "${OUT_DIR}/signatures/governance_SHA256SUMS.sig" \
            --output-certificate "${OUT_DIR}/signatures/governance_SHA256SUMS.crt" \
            "${OUT_DIR}/governance_SHA256SUMS" 2>/dev/null || {
            log_warn "Cosign signing failed (keyless signing may require OIDC)"
        }
    else
        log_warn "Signing requested but cosign not found"
    fi
fi

# Compute overall lockfile hash (for embedding in provenance)
LOCKFILE_HASH=$(sha256sum "$LOCKFILE_JSON" | cut -d' ' -f1)
SUMS_HASH=$(sha256sum "$SUMS_FILE" | cut -d' ' -f1)

# Output summary
log_success "Governance lockfile generated: $OUT_DIR"

if [[ "$VERBOSE" == "true" ]]; then
    echo ""
    echo "Files collected: ${#SORTED_FILES[@]}"
    echo "Files missing: ${#MISSING_FILES[@]}"
    echo ""
    echo "Output files:"
    ls -la "$OUT_DIR"
    echo ""
fi

# Output JSON summary for CI integration
cat << EOF
{
  "lockfile_path": "${OUT_DIR}/governance_lockfile.json",
  "sums_path": "${OUT_DIR}/governance_SHA256SUMS",
  "lockfile_sha256": "${LOCKFILE_HASH}",
  "sums_sha256": "${SUMS_HASH}",
  "files_collected": ${#SORTED_FILES[@]},
  "files_missing": ${#MISSING_FILES[@]}
}
EOF
