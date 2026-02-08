#!/usr/bin/env bash
# Shai-Hulud Supply Chain Security: npm Lifecycle Script Verifier
#
# This script verifies that no packages with lifecycle scripts are installed
# unless they are explicitly on the allowlist.
#
# Usage:
#   ./scripts/ci/verify-npm-lifecycle.sh
#   ./scripts/ci/verify-npm-lifecycle.sh --verbose
#   ./scripts/ci/verify-npm-lifecycle.sh --fix  # Add missing to allowlist (interactive)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ALLOWLIST="$PROJECT_ROOT/policy/npm-lifecycle-allowlist.json"
VERBOSE=false
FIX_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v) VERBOSE=true; shift ;;
        --fix) FIX_MODE=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "$1"
    fi
}

# Check allowlist exists
if [[ ! -f "$ALLOWLIST" ]]; then
    echo "ERROR: Allowlist not found at $ALLOWLIST"
    exit 1
fi

# Extract allowed package names from JSON
ALLOWED_PACKAGES=$(jq -r '.allowed_packages[].name' "$ALLOWLIST" 2>/dev/null || echo "")

log "Scanning for packages with lifecycle scripts..."

# Find packages with scripts in package.json
VIOLATIONS=()
CHECKED=0

# Track already seen packages to avoid duplicates
declare -A SEEN_PACKAGES

check_package() {
    local pkg_json="$1"

    CHECKED=$((CHECKED + 1))
    PKG_NAME=$(jq -r '.name // empty' "$pkg_json" 2>/dev/null || true)

    if [[ -z "$PKG_NAME" ]]; then
        return
    fi

    # Skip if already seen
    if [[ -n "${SEEN_PACKAGES[$PKG_NAME]:-}" ]]; then
        return
    fi
    SEEN_PACKAGES[$PKG_NAME]=1

    # Check for lifecycle scripts
    HAS_PREINSTALL=$(jq -r '.scripts.preinstall // empty' "$pkg_json" 2>/dev/null || true)
    HAS_POSTINSTALL=$(jq -r '.scripts.postinstall // empty' "$pkg_json" 2>/dev/null || true)
    HAS_INSTALL=$(jq -r '.scripts.install // empty' "$pkg_json" 2>/dev/null || true)
    HAS_PREPARE=$(jq -r '.scripts.prepare // empty' "$pkg_json" 2>/dev/null || true)

    if [[ -n "$HAS_PREINSTALL" || -n "$HAS_POSTINSTALL" || -n "$HAS_INSTALL" || -n "$HAS_PREPARE" ]]; then
        # Check if on allowlist
        IS_ALLOWED=false
        for allowed in $ALLOWED_PACKAGES; do
            # Handle glob patterns like @esbuild/*
            if [[ "$allowed" == *"*"* ]]; then
                pattern="${allowed/\*/.*}"
                if [[ "$PKG_NAME" =~ ^$pattern$ ]]; then
                    IS_ALLOWED=true
                    break
                fi
            elif [[ "$PKG_NAME" == "$allowed" ]]; then
                IS_ALLOWED=true
                break
            fi
        done

        if [[ "$IS_ALLOWED" == "false" ]]; then
            SCRIPTS=""
            [[ -n "$HAS_PREINSTALL" ]] && SCRIPTS+="preinstall "
            [[ -n "$HAS_INSTALL" ]] && SCRIPTS+="install "
            [[ -n "$HAS_POSTINSTALL" ]] && SCRIPTS+="postinstall "
            [[ -n "$HAS_PREPARE" ]] && SCRIPTS+="prepare "

            VIOLATIONS+=("$PKG_NAME: $SCRIPTS")
            log "[VIOLATION] $PKG_NAME has lifecycle scripts: $SCRIPTS"
        else
            log "[ALLOWED] $PKG_NAME"
        fi
    fi
}

# Scan pnpm store (node_modules/.pnpm) for package.json files
log "Scanning pnpm store..."
while IFS= read -r -d '' pkg_json; do
    check_package "$pkg_json"
done < <(find "$PROJECT_ROOT/node_modules/.pnpm" -maxdepth 4 -name "package.json" -print0 2>/dev/null || true)

# Also scan direct node_modules for non-pnpm packages
log "Scanning direct node_modules..."
while IFS= read -r -d '' pkg_json; do
    check_package "$pkg_json"
done < <(find "$PROJECT_ROOT/node_modules" -maxdepth 3 -name "package.json" ! -path "*/node_modules/.pnpm/*" -print0 2>/dev/null || true)

echo ""
echo "=== npm Lifecycle Script Verification ==="
echo "Packages checked: $CHECKED"
echo "Violations found: ${#VIOLATIONS[@]}"
echo ""

if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
    echo "The following packages have lifecycle scripts but are NOT on the allowlist:"
    echo ""
    for v in "${VIOLATIONS[@]}"; do
        echo "  - $v"
    done
    echo ""
    echo "To allow these packages, add them to:"
    echo "  $ALLOWLIST"
    echo ""
    echo "SECURITY: Review each package before adding to allowlist!"
    exit 1
else
    echo "[PASS] All packages with lifecycle scripts are on the allowlist"
    exit 0
fi
