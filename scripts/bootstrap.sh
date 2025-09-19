#!/usr/bin/env bash
set -euo pipefail

# IntelGraph Development Environment Bootstrap Script
# Sets up hermetic development environment in ≤10 minutes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[BOOTSTRAP]${NC} $*"
}

warn() {
    echo -e "${YELLOW}[BOOTSTRAP WARN]${NC} $*"
}

error() {
    echo -e "${RED}[BOOTSTRAP ERROR]${NC} $*"
    exit 1
}

success() {
    echo -e "${GREEN}[BOOTSTRAP SUCCESS]${NC} $*"
}

# Configuration
NODE_VERSION="20"
PYTHON_VERSION="3.11"
GO_VERSION="1.21"

check_system() {
    log "Checking system requirements..."

    # Check OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        DISTRO=$(lsb_release -si 2>/dev/null || echo "Unknown")
        log "Detected Linux: $DISTRO"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log "Detected macOS"
        if ! command -v brew >/dev/null 2>&1; then
            error "Homebrew is required on macOS. Please install: https://brew.sh"
        fi
    else
        error "Unsupported OS: $OSTYPE"
    fi

    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" == "x86_64" ]]; then
        ARCH="amd64"
    elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
        ARCH="arm64"
    else
        warn "Unknown architecture: $ARCH"
    fi

    log "System: $OS-$ARCH"
}

install_system_dependencies() {
    log "Installing system dependencies..."

    if [[ "$OS" == "macos" ]]; then
        # macOS with Homebrew
        log "Installing dependencies via Homebrew..."
        brew update >/dev/null 2>&1 || true

        local packages=(
            "git" "curl" "wget" "jq" "yq"
            "shellcheck" "actionlint"
            "docker" "docker-compose"
            "postgresql@14" "redis"
        )

        for package in "${packages[@]}"; do
            if ! brew list "$package" >/dev/null 2>&1; then
                log "Installing $package..."
                brew install "$package" || warn "Failed to install $package"
            fi
        done

    elif [[ "$OS" == "linux" ]]; then
        # Linux - try to detect package manager
        if command -v apt-get >/dev/null 2>&1; then
            log "Installing dependencies via apt..."
            sudo apt-get update >/dev/null 2>&1 || true
            sudo apt-get install -y \
                git curl wget jq \
                shellcheck \
                docker.io docker-compose \
                postgresql-client redis-tools \
                python3-pip python3-venv \
                build-essential || warn "Some packages failed to install"

        elif command -v yum >/dev/null 2>&1; then
            log "Installing dependencies via yum..."
            sudo yum update -y >/dev/null 2>&1 || true
            sudo yum install -y \
                git curl wget jq \
                docker docker-compose \
                postgresql redis \
                python3-pip \
                gcc gcc-c++ make || warn "Some packages failed to install"

        else
            warn "No supported package manager found. Please install dependencies manually."
        fi
    fi
}

install_node() {
    log "Setting up Node.js $NODE_VERSION..."

    # Check if Node is already installed with correct version
    if command -v node >/dev/null 2>&1; then
        local current_version
        current_version=$(node --version | sed 's/v//')
        if [[ "$current_version" == "$NODE_VERSION"* ]]; then
            log "Node.js $NODE_VERSION already installed"
            return 0
        fi
    fi

    # Install Node via nvm if available, otherwise direct install
    if command -v nvm >/dev/null 2>&1; then
        log "Installing Node.js $NODE_VERSION via nvm..."
        nvm install "$NODE_VERSION"
        nvm use "$NODE_VERSION"
        nvm alias default "$NODE_VERSION"
    else
        log "Installing nvm and Node.js..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        # shellcheck source=/dev/null
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install "$NODE_VERSION"
        nvm use "$NODE_VERSION"
        nvm alias default "$NODE_VERSION"
    fi

    # Verify installation
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js installation failed"
    fi

    log "Node.js version: $(node --version)"
    log "npm version: $(npm --version)"
}

install_python() {
    log "Setting up Python $PYTHON_VERSION..."

    # Check if Python is already installed with correct version
    if command -v python3 >/dev/null 2>&1; then
        local current_version
        current_version=$(python3 --version | awk '{print $2}')
        if [[ "$current_version" == "$PYTHON_VERSION"* ]]; then
            log "Python $PYTHON_VERSION already available"
        fi
    fi

    # Ensure pip is available
    if ! command -v pip3 >/dev/null 2>&1; then
        if [[ "$OS" == "macos" ]]; then
            brew install python@3.11 || warn "Failed to install Python"
        elif command -v apt-get >/dev/null 2>&1; then
            sudo apt-get install -y python3-pip || warn "Failed to install pip"
        fi
    fi

    # Install common Python tools
    pip3 install --user --upgrade pip setuptools wheel || warn "Failed to upgrade pip"
}

install_go() {
    log "Setting up Go $GO_VERSION..."

    # Check if Go is already installed with correct version
    if command -v go >/dev/null 2>&1; then
        local current_version
        current_version=$(go version | awk '{print $3}' | sed 's/go//')
        if [[ "$current_version" == "$GO_VERSION"* ]]; then
            log "Go $GO_VERSION already installed"
            return 0
        fi
    fi

    # Install Go
    local go_archive="go${GO_VERSION}.${OS}-${ARCH}.tar.gz"
    local go_url="https://golang.org/dl/${go_archive}"

    log "Downloading Go $GO_VERSION..."
    curl -fsSL "$go_url" -o "/tmp/$go_archive"

    if [[ "$OS" == "macos" ]]; then
        sudo tar -C /usr/local -xzf "/tmp/$go_archive"
    else
        sudo rm -rf /usr/local/go
        sudo tar -C /usr/local -xzf "/tmp/$go_archive"
    fi

    rm "/tmp/$go_archive"

    # Add to PATH
    if ! grep -q "/usr/local/go/bin" ~/.bashrc 2>/dev/null; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    fi

    if ! grep -q "/usr/local/go/bin" ~/.zshrc 2>/dev/null; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.zshrc
    fi

    export PATH=$PATH:/usr/local/go/bin

    log "Go version: $(go version)"
}

install_development_tools() {
    log "Installing development tools..."

    # Install global npm packages
    local npm_packages=(
        "typescript"
        "ts-node"
        "@types/node"
        "eslint"
        "prettier"
        "license-checker"
        "npm-check-updates"
    )

    for package in "${npm_packages[@]}"; do
        log "Installing npm package: $package"
        npm install -g "$package" || warn "Failed to install $package"
    done

    # Install cosign for container signing
    if ! command -v cosign >/dev/null 2>&1; then
        log "Installing cosign..."
        if [[ "$OS" == "macos" ]]; then
            brew install cosign || warn "Failed to install cosign"
        else
            local cosign_version="v2.2.4"
            curl -fsSL "https://github.com/sigstore/cosign/releases/download/${cosign_version}/cosign-linux-${ARCH}" \
                -o cosign
            chmod +x cosign
            sudo mv cosign /usr/local/bin/
        fi
    fi

    # Install syft for SBOM generation
    if ! command -v syft >/dev/null 2>&1; then
        log "Installing syft..."
        curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
    fi

    # Install k6 for performance testing
    if ! command -v k6 >/dev/null 2>&1; then
        log "Installing k6..."
        if [[ "$OS" == "macos" ]]; then
            brew install k6 || warn "Failed to install k6"
        else
            curl -fsSL https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz \
                | tar -xzf - --strip-components=1 -C /tmp
            sudo mv /tmp/k6 /usr/local/bin/
        fi
    fi

    # Install promtool for Prometheus rule testing
    if ! command -v promtool >/dev/null 2>&1; then
        log "Installing promtool..."
        local prom_version="2.47.0"
        curl -fsSL "https://github.com/prometheus/prometheus/releases/download/v${prom_version}/prometheus-${prom_version}.${OS}-${ARCH}.tar.gz" \
            | tar -xzf - --strip-components=1 -C /tmp "prometheus-${prom_version}.${OS}-${ARCH}/promtool"
        sudo mv /tmp/promtool /usr/local/bin/
    fi
}

setup_project() {
    log "Setting up project dependencies..."

    # Install Node.js dependencies
    if [[ -f "package.json" ]]; then
        log "Installing npm dependencies..."
        npm ci --frozen-lockfile
    fi

    # Set up pre-commit hooks
    if [[ -f ".pre-commit-config.yaml" ]]; then
        log "Setting up pre-commit hooks..."
        if command -v pre-commit >/dev/null 2>&1; then
            pre-commit install
        else
            pip3 install --user pre-commit
            pre-commit install
        fi
    fi

    # Create necessary directories
    log "Creating project directories..."
    mkdir -p {logs,dist,coverage,.npm-cache}

    # Set up environment file
    if [[ ! -f ".env.local" && -f ".env.example" ]]; then
        log "Creating .env.local from .env.example..."
        cp .env.example .env.local
        warn "Please update .env.local with your local configuration"
    fi
}

verify_installation() {
    log "Verifying installation..."

    local tools=(
        "node:Node.js"
        "npm:npm"
        "python3:Python"
        "pip3:pip"
        "docker:Docker"
        "git:Git"
        "jq:jq"
        "cosign:cosign"
        "syft:syft"
        "k6:k6"
        "promtool:promtool"
    )

    local missing_tools=()

    for tool_entry in "${tools[@]}"; do
        IFS=':' read -r cmd name <<< "$tool_entry"
        if command -v "$cmd" >/dev/null 2>&1; then
            log "✅ $name: $(command -v "$cmd")"
        else
            warn "❌ $name not found"
            missing_tools+=("$name")
        fi
    done

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        warn "Missing tools: ${missing_tools[*]}"
        warn "Some functionality may not work correctly"
    fi

    # Test fast local loop
    log "Testing fast local loop..."
    local start_time=$(date +%s)

    if make --version >/dev/null 2>&1; then
        if make help >/dev/null 2>&1; then
            log "✅ Makefile targets available"
        fi
    fi

    if [[ -f "package.json" ]]; then
        if npm run lint --if-present >/dev/null 2>&1; then
            log "✅ Lint command available"
        fi

        if npm run typecheck --if-present >/dev/null 2>&1; then
            log "✅ TypeScript checking available"
        fi
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [[ $duration -lt 90 ]]; then
        success "✅ Fast local loop verified (${duration}s)"
    else
        warn "⚠️  Local loop took ${duration}s (target: <90s)"
    fi
}

print_next_steps() {
    success "🎉 Bootstrap completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your terminal or run: source ~/.bashrc"
    echo "  2. Run: make help"
    echo "  3. Run: make check  # Should complete in <90s"
    echo "  4. Run: make dev-setup  # If you need additional setup"
    echo ""
    echo "Useful commands:"
    echo "  make check          # Fast lint+type+unit (≤90s)"
    echo "  make test           # Full test suite"
    echo "  make mc-build       # Orchestrated build"
    echo ""
    echo "VS Code users:"
    echo "  - Install 'Dev Containers' extension"
    echo "  - Reopen in container for full experience"
    echo ""
}

main() {
    local start_time=$(date +%s)

    log "🚀 Starting IntelGraph development environment bootstrap..."
    log "Target completion time: ≤10 minutes"

    check_system
    install_system_dependencies
    install_node
    install_python
    install_go
    install_development_tools
    setup_project
    verify_installation

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))

    if [[ $duration -lt 600 ]]; then  # 10 minutes
        success "✅ Bootstrap completed in ${minutes}m ${seconds}s (target: ≤10m)"
    else
        warn "⚠️  Bootstrap took ${minutes}m ${seconds}s (target: ≤10m)"
    fi

    print_next_steps
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            echo "IntelGraph Development Environment Bootstrap"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --help, -h     Show this help message"
            echo "  --verify-only  Only run verification checks"
            echo ""
            exit 0
            ;;
        --verify-only)
            verify_installation
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
    shift
done

# Run main bootstrap
main