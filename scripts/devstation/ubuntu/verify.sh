#!/usr/bin/env bash
#
# Summit Dev Station Verification Script
#
# This script verifies that all required tools are installed and prints their versions.
# Exit codes:
#   0 - All required tools present
#   1 - One or more required tools missing
#   2 - Optional tools missing (warning only)
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
MISSING_REQUIRED=0
MISSING_OPTIONAL=0

# ============================================================================
# Helper Functions
# ============================================================================

log() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $*"
}

log_error() {
    echo -e "${RED}[✗]${NC} $*"
}

# Check if command exists and print version
check_tool() {
    local tool="$1"
    local required="${2:-yes}"
    local version_cmd="${3:-$tool --version}"

    if command -v "$tool" >/dev/null 2>&1; then
        local version
        version=$(eval "$version_cmd" 2>&1 | head -n1 || echo "installed")
        printf "${GREEN}%-20s${NC} %s\n" "$tool" "$version"
        return 0
    else
        if [[ "$required" == "yes" ]]; then
            printf "${RED}%-20s${NC} %s\n" "$tool" "MISSING (required)"
            ((MISSING_REQUIRED++))
        else
            printf "${YELLOW}%-20s${NC} %s\n" "$tool" "not installed (optional)"
            ((MISSING_OPTIONAL++))
        fi
        return 1
    fi
}

# Check if user is in docker group
check_docker_group() {
    if groups | grep -q docker; then
        log_success "User is in docker group"
        return 0
    else
        log_warn "User is NOT in docker group (may need to log out/in)"
        return 1
    fi
}

# Check connectivity to key services
check_connectivity() {
    log "Checking network connectivity..."

    local urls=(
        "https://github.com"
        "https://registry.npmjs.org"
        "https://deb.nodesource.com"
        "https://download.docker.com"
    )

    for url in "${urls[@]}"; do
        if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
            log_success "Can reach: $url"
        else
            log_warn "Cannot reach: $url"
        fi
    done
}

# ============================================================================
# Main Verification
# ============================================================================

main() {
    echo "======================================================================"
    echo "  Summit Dev Station Verification"
    echo "======================================================================"
    echo

    log "Checking required tools..."
    echo "----------------------------------------------------------------------"

    # Core tools (required)
    check_tool "git"
    check_tool "curl"
    check_tool "wget"
    check_tool "jq"
    check_tool "node" "yes" "node --version"
    check_tool "pnpm" "yes" "pnpm --version"
    check_tool "docker" "yes" "docker --version"
    check_tool "python3" "yes" "python3 --version"
    check_tool "pip3" "yes" "pip3 --version"
    check_tool "pipx" "yes" "pipx --version"
    check_tool "pre-commit" "yes" "pre-commit --version"
    check_tool "gitleaks" "yes" "gitleaks version"

    echo
    log "Checking optional tools..."
    echo "----------------------------------------------------------------------"

    # Optional but recommended
    check_tool "yq" "no"
    check_tool "rg" "no" "rg --version"
    check_tool "fd" "no" "fd --version"
    check_tool "kubectl" "no" "kubectl version --client"
    check_tool "helm" "no" "helm version"
    check_tool "k9s" "no" "k9s version"
    check_tool "terraform" "no" "terraform --version"
    check_tool "packer" "no" "packer --version"
    check_tool "code" "no" "code --version"
    check_tool "ollama" "no" "ollama --version"

    echo
    log "Checking Docker configuration..."
    echo "----------------------------------------------------------------------"

    if command -v docker >/dev/null 2>&1; then
        check_docker_group

        # Test docker run (only if user has permissions)
        if groups | grep -q docker || [[ $EUID -eq 0 ]]; then
            if docker ps >/dev/null 2>&1; then
                log_success "Docker daemon is running and accessible"
            else
                log_error "Docker daemon is not running or not accessible"
                ((MISSING_REQUIRED++))
            fi
        else
            log_warn "Cannot test docker - user not in docker group yet"
        fi
    fi

    echo
    check_connectivity

    echo
    echo "======================================================================"
    echo "  Verification Summary"
    echo "======================================================================"

    if [[ $MISSING_REQUIRED -eq 0 ]]; then
        log_success "All required tools are installed!"
    else
        log_error "${MISSING_REQUIRED} required tool(s) missing"
    fi

    if [[ $MISSING_OPTIONAL -gt 0 ]]; then
        log_warn "${MISSING_OPTIONAL} optional tool(s) not installed"
    fi

    # Check for manifest file
    MANIFEST_FILE="${HOME}/.summit-devstation-manifest.json"
    if [[ -f "$MANIFEST_FILE" ]]; then
        log "Installation manifest found at: ${MANIFEST_FILE}"
        log "Bootstrap timestamp: $(jq -r '.timestamp // "unknown"' "$MANIFEST_FILE")"
    else
        log_warn "No installation manifest found (expected at ${MANIFEST_FILE})"
    fi

    echo
    log "Next steps:"
    echo "  1. Clone Summit repository: git clone https://github.com/YourOrg/summit.git"
    echo "  2. Install dependencies: cd summit && pnpm install"
    echo "  3. Build the project: pnpm build"
    echo "  4. Run tests: pnpm test"
    echo "  5. See docs/devstation/README.md for more details"
    echo

    # Exit with appropriate code
    if [[ $MISSING_REQUIRED -gt 0 ]]; then
        exit 1
    elif [[ $MISSING_OPTIONAL -gt 0 ]]; then
        exit 2
    else
        exit 0
    fi
}

main "$@"
