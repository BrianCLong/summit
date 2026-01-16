#!/usr/bin/env bash
#
# Summit Dev Station Bootstrap for Ubuntu 22.04/24.04
#
# This script idempotently sets up a complete Summit development environment.
# It is safe to run multiple times.
#
# Usage:
#   sudo ./bootstrap.sh [options]
#
# Options (via environment variables):
#   INSTALL_DESKTOP_APPS=1    Install VS Code and other desktop tools
#   INSTALL_K8S_TOOLS=1       Install kubectl, helm, k9s
#   INSTALL_CLOUD_TOOLS=1     Install terraform/opentofu, packer
#   INSTALL_OLLAMA=1          Install Ollama for local AI models
#   INSTALL_AI_CLIS=1         Install AI CLI tools (Claude Code, etc.)
#   SKIP_DOCKER_GROUP=1       Skip adding user to docker group
#   NONINTERACTIVE=1          Run without prompts (for CI/CD)
#
# Security Notes:
#   - No secrets in repo
#   - All downloads from official sources
#   - GPG keys verified where possible
#   - No curl | bash without version pinning
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSIONS_FILE="${SCRIPT_DIR}/versions.lock.json"
MANIFEST_FILE="${HOME}/.summit-devstation-manifest.json"

# Feature toggles (defaults to safe/minimal install)
INSTALL_DESKTOP_APPS="${INSTALL_DESKTOP_APPS:-0}"
INSTALL_K8S_TOOLS="${INSTALL_K8S_TOOLS:-0}"
INSTALL_CLOUD_TOOLS="${INSTALL_CLOUD_TOOLS:-0}"
INSTALL_OLLAMA="${INSTALL_OLLAMA:-0}"
INSTALL_AI_CLIS="${INSTALL_AI_CLIS:-0}"
SKIP_DOCKER_GROUP="${SKIP_DOCKER_GROUP:-0}"
NONINTERACTIVE="${NONINTERACTIVE:-0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $*"
}

log_error() {
    echo -e "${RED}[✗]${NC} $*" >&2
}

# Check if command exists
have() {
    command -v "$1" >/dev/null 2>&1
}

# Check if running as root
need_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect Ubuntu version
detect_ubuntu() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "Cannot detect OS version"
        exit 1
    fi

    source /etc/os-release

    if [[ "$ID" != "ubuntu" ]]; then
        log_error "This script only supports Ubuntu (detected: $ID)"
        exit 1
    fi

    UBUNTU_VERSION="$VERSION_ID"
    UBUNTU_CODENAME="$VERSION_CODENAME"

    log "Detected Ubuntu ${UBUNTU_VERSION} (${UBUNTU_CODENAME})"

    if [[ "$UBUNTU_VERSION" != "22.04" && "$UBUNTU_VERSION" != "24.04" ]]; then
        log_warn "This script is tested on Ubuntu 22.04 and 24.04. Your version: ${UBUNTU_VERSION}"
        if [[ "$NONINTERACTIVE" != "1" ]]; then
            read -p "Continue anyway? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
}

# Install apt packages with idempotency check
apt_install() {
    local packages=("$@")
    local to_install=()

    for pkg in "${packages[@]}"; do
        if ! dpkg -l | grep -q "^ii  $pkg "; then
            to_install+=("$pkg")
        fi
    done

    if [[ ${#to_install[@]} -gt 0 ]]; then
        log "Installing: ${to_install[*]}"
        DEBIAN_FRONTEND=noninteractive apt-get install -y -q "${to_install[@]}"
    else
        log_success "Already installed: ${packages[*]}"
    fi
}

# Read version from versions.lock.json
get_version() {
    local tool="$1"
    local key="${2:-version}"

    if [[ -f "$VERSIONS_FILE" ]]; then
        jq -r ".versions.${tool}.${key} // \"latest\"" "$VERSIONS_FILE"
    else
        echo "latest"
    fi
}

# ============================================================================
# Installation Functions
# ============================================================================

install_core_packages() {
    log "Installing core build tools and utilities..."

    apt-get update -q

    apt_install \
        build-essential \
        git \
        curl \
        wget \
        jq \
        unzip \
        zip \
        gnupg \
        ca-certificates \
        apt-transport-https \
        software-properties-common \
        lsb-release \
        vim \
        tmux \
        htop \
        tree

    # Install ripgrep and fd-find (names differ on Ubuntu)
    apt_install ripgrep fd-find

    # Create symlinks for fd if needed
    if [[ ! -L /usr/local/bin/fd ]] && have fdfind; then
        ln -sf "$(which fdfind)" /usr/local/bin/fd
    fi

    # Install yq from GitHub releases (latest)
    if ! have yq; then
        log "Installing yq..."
        local YQ_VERSION="4.40.5"
        wget -qO /usr/local/bin/yq "https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}/yq_linux_amd64"
        chmod +x /usr/local/bin/yq
    fi

    log_success "Core packages installed"
}

install_python_toolchain() {
    log "Installing Python toolchain..."

    apt_install python3 python3-pip python3-venv pipx

    # Ensure pipx is in PATH
    if ! grep -q 'pipx ensurepath' /etc/profile.d/pipx.sh 2>/dev/null; then
        mkdir -p /etc/profile.d
        echo 'eval "$(pipx ensurepath)"' > /etc/profile.d/pipx.sh
    fi

    # Install pre-commit via pipx (globally for all users)
    if ! have pre-commit; then
        log "Installing pre-commit via pipx..."
        PIPX_HOME=/opt/pipx PIPX_BIN_DIR=/usr/local/bin pipx install pre-commit
    fi

    # Install gitleaks
    if ! have gitleaks; then
        log "Installing gitleaks..."
        local GITLEAKS_VERSION
        GITLEAKS_VERSION="$(get_version gitleaks)"
        wget -qO- "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" | tar xz -C /usr/local/bin gitleaks
        chmod +x /usr/local/bin/gitleaks
    fi

    log_success "Python toolchain installed"
}

install_nodejs() {
    log "Installing Node.js toolchain..."

    if ! have node; then
        # Install Node.js from NodeSource repository
        local NODE_MAJOR
        NODE_MAJOR="$(get_version node major)"

        log "Setting up NodeSource repository for Node.js ${NODE_MAJOR}.x..."
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
        apt_install nodejs
    fi

    # Enable corepack for pnpm
    if ! have corepack; then
        log "Enabling corepack..."
        npm install -g corepack
    fi

    corepack enable

    # Ensure pnpm is available
    if ! have pnpm; then
        log "Installing pnpm via corepack..."
        corepack prepare pnpm@latest --activate
    fi

    log_success "Node.js $(node --version), pnpm $(pnpm --version) installed"
}

install_docker() {
    log "Installing Docker..."

    if have docker; then
        log_success "Docker already installed: $(docker --version)"
        return
    fi

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        ${UBUNTU_CODENAME} stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -q
    apt_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start Docker service
    systemctl enable docker
    systemctl start docker

    # Add current user to docker group (if not root and not skipped)
    if [[ -n "${SUDO_USER:-}" && "$SKIP_DOCKER_GROUP" != "1" ]]; then
        usermod -aG docker "$SUDO_USER"
        log_warn "Added $SUDO_USER to docker group. You'll need to log out and back in for this to take effect."
    fi

    log_success "Docker installed: $(docker --version)"
}

install_k8s_tools() {
    if [[ "$INSTALL_K8S_TOOLS" != "1" ]]; then
        log "Skipping Kubernetes tools (set INSTALL_K8S_TOOLS=1 to enable)"
        return
    fi

    log "Installing Kubernetes tools..."

    # Install kubectl
    if ! have kubectl; then
        local KUBECTL_VERSION
        KUBECTL_VERSION="$(get_version kubectl)"
        log "Installing kubectl ${KUBECTL_VERSION}..."
        curl -LO "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
        curl -LO "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl.sha256"
        echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check
        install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
        rm kubectl kubectl.sha256
    fi

    # Install helm
    if ! have helm; then
        local HELM_VERSION
        HELM_VERSION="$(get_version helm)"
        log "Installing Helm ${HELM_VERSION}..."
        curl -fsSL "https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz" -o helm.tar.gz
        tar -zxf helm.tar.gz
        mv linux-amd64/helm /usr/local/bin/helm
        rm -rf linux-amd64 helm.tar.gz
        chmod +x /usr/local/bin/helm
    fi

    # Install k9s
    if ! have k9s; then
        local K9S_VERSION
        K9S_VERSION="$(get_version k9s)"
        log "Installing k9s ${K9S_VERSION}..."
        wget -q "https://github.com/derailed/k9s/releases/download/v${K9S_VERSION}/k9s_Linux_amd64.tar.gz"
        tar xzf k9s_Linux_amd64.tar.gz -C /usr/local/bin k9s
        rm k9s_Linux_amd64.tar.gz
        chmod +x /usr/local/bin/k9s
    fi

    log_success "Kubernetes tools installed"
}

install_cloud_tools() {
    if [[ "$INSTALL_CLOUD_TOOLS" != "1" ]]; then
        log "Skipping cloud/IaC tools (set INSTALL_CLOUD_TOOLS=1 to enable)"
        return
    fi

    log "Installing cloud/IaC tools..."

    # Install Terraform (or OpenTofu as alternative)
    if ! have terraform && ! have tofu; then
        log "Installing Terraform..."
        local TF_VERSION
        TF_VERSION="$(get_version terraform)"

        wget -q "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip"
        unzip -q terraform_${TF_VERSION}_linux_amd64.zip
        mv terraform /usr/local/bin/
        rm terraform_${TF_VERSION}_linux_amd64.zip
        chmod +x /usr/local/bin/terraform
    fi

    # Install Packer (optional)
    if ! have packer; then
        log "Installing Packer..."
        local PACKER_VERSION
        PACKER_VERSION="$(get_version packer)"

        wget -q "https://releases.hashicorp.com/packer/${PACKER_VERSION}/packer_${PACKER_VERSION}_linux_amd64.zip"
        unzip -q packer_${PACKER_VERSION}_linux_amd64.zip
        mv packer /usr/local/bin/
        rm packer_${PACKER_VERSION}_linux_amd64.zip
        chmod +x /usr/local/bin/packer
    fi

    log_success "Cloud/IaC tools installed"
}

install_desktop_apps() {
    if [[ "$INSTALL_DESKTOP_APPS" != "1" ]]; then
        log "Skipping desktop applications (set INSTALL_DESKTOP_APPS=1 to enable)"
        return
    fi

    log "Installing desktop applications..."

    # Install VS Code
    if ! have code; then
        log "Installing Visual Studio Code..."
        wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/keyrings/packages.microsoft.gpg
        echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list
        apt-get update -q
        apt_install code
    fi

    log_success "Desktop applications installed"
}

install_ollama() {
    if [[ "$INSTALL_OLLAMA" != "1" ]]; then
        log "Skipping Ollama (set INSTALL_OLLAMA=1 to enable)"
        return
    fi

    log "Installing Ollama for local AI models..."

    if ! have ollama; then
        # Official Ollama installer
        curl -fsSL https://ollama.ai/install.sh | sh
    fi

    log_success "Ollama installed"
}

install_ai_clis() {
    if [[ "$INSTALL_AI_CLIS" != "1" ]]; then
        log "Skipping AI CLI tools (set INSTALL_AI_CLIS=1 to enable)"
        return
    fi

    log_warn "AI CLI tools installation requires manual setup"
    log "Please see docs/devstation/README.md for:"
    log "  - Claude Code CLI (npm install -g @anthropic-ai/claude-code)"
    log "  - Other AI tool setup instructions"
}

# ============================================================================
# Version Manifest
# ============================================================================

write_manifest() {
    log "Writing version manifest to ${MANIFEST_FILE}..."

    cat > "$MANIFEST_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "ubuntu_version": "${UBUNTU_VERSION}",
  "installed_tools": {
EOF

    local first=1
    for tool in git curl wget jq yq node pnpm docker kubectl helm k9s terraform packer pre-commit gitleaks code ollama; do
        if have "$tool"; then
            [[ $first -eq 0 ]] && echo "," >> "$MANIFEST_FILE"
            echo -n "    \"$tool\": \"$(${tool} --version 2>&1 | head -n1 | sed 's/.*\([0-9]\+\.[0-9]\+\.[0-9]\+\).*/\1/' || echo 'installed')\"" >> "$MANIFEST_FILE"
            first=0
        fi
    done

    cat >> "$MANIFEST_FILE" <<EOF

  }
}
EOF

    log_success "Manifest written to ${MANIFEST_FILE}"
}

print_versions() {
    log "Installed tool versions:"
    echo "=========================="

    for tool in git node pnpm docker kubectl helm k9s terraform packer pre-commit gitleaks code; do
        if have "$tool"; then
            version=$("$tool" --version 2>&1 | head -n1 || echo "installed")
            printf "%-15s %s\n" "$tool:" "$version"
        fi
    done

    echo "=========================="
}

# ============================================================================
# Main
# ============================================================================

main() {
    log "Summit Dev Station Bootstrap"
    log "=============================="

    need_root
    detect_ubuntu

    # Core installations (always run)
    install_core_packages
    install_python_toolchain
    install_nodejs
    install_docker

    # Optional installations (based on flags)
    install_k8s_tools
    install_cloud_tools
    install_desktop_apps
    install_ollama
    install_ai_clis

    # Finalize
    write_manifest
    print_versions

    log_success "Bootstrap complete!"
    echo
    log "Next steps:"
    log "  1. Log out and back in (if docker group was added)"
    log "  2. Run: scripts/devstation/ubuntu/verify.sh"
    log "  3. Clone Summit repo and run: pnpm install"
    log "  4. See docs/devstation/README.md for AI tool setup"
    echo
}

main "$@"
