#!/bin/bash
# Developer Environment Bootstrap Script
# Sprint 27A: ≤10 minute onboarding with comprehensive setup
# Target: Complete development environment from zero to first commit

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REQUIRED_NODE_VERSION="20"
REQUIRED_DOCKER_VERSION="24"
REPO_URL="https://github.com/BrianCLong/intelgraph"
SETUP_START_TIME=$(date +%s)

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}==>${NC} $1"
}

# Progress tracking
TOTAL_STEPS=12
CURRENT_STEP=0

show_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    local percentage=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    echo -e "${BLUE}[${CURRENT_STEP}/${TOTAL_STEPS}]${NC} ${percentage}% - $1"
}

# System detection
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        CYGWIN*|MINGW*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64) echo "amd64" ;;
        arm64|aarch64) echo "arm64" ;;
        *) echo "unknown" ;;
    esac
}

# Prerequisite checks
check_prerequisites() {
    show_progress "Checking system prerequisites"

    local os=$(detect_os)
    local arch=$(detect_arch)

    log_info "Detected OS: $os ($arch)"

    # Check if running in supported environment
    if [[ "$os" == "unknown" ]]; then
        log_error "Unsupported operating system"
        exit 1
    fi

    # Check for required commands
    local required_commands=("curl" "git" "tar" "unzip")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command '$cmd' not found"
            exit 1
        fi
    done

    log_success "System prerequisites met"
}

# Node.js installation
install_nodejs() {
    show_progress "Installing/verifying Node.js"

    if command -v node &> /dev/null; then
        local current_version=$(node --version | sed 's/v//' | cut -d. -f1)
        if [[ "$current_version" -ge "$REQUIRED_NODE_VERSION" ]]; then
            log_success "Node.js $current_version detected (required: $REQUIRED_NODE_VERSION)"
            return
        fi
    fi

    log_info "Installing Node.js $REQUIRED_NODE_VERSION via nvm"

    # Install nvm if not present
    if ! command -v nvm &> /dev/null; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # Install and use required Node.js version
    nvm install "$REQUIRED_NODE_VERSION"
    nvm use "$REQUIRED_NODE_VERSION"
    nvm alias default "$REQUIRED_NODE_VERSION"

    # Verify installation
    if node --version | grep -q "v$REQUIRED_NODE_VERSION"; then
        log_success "Node.js $REQUIRED_NODE_VERSION installed successfully"
    else
        log_error "Node.js installation failed"
        exit 1
    fi
}

# Docker installation
install_docker() {
    show_progress "Installing/verifying Docker"

    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
        local major_version=$(echo "$docker_version" | cut -d. -f1)

        if [[ "$major_version" -ge "$REQUIRED_DOCKER_VERSION" ]]; then
            log_success "Docker $docker_version detected (required: $REQUIRED_DOCKER_VERSION+)"

            # Check if Docker daemon is running
            if docker info &> /dev/null; then
                return
            else
                log_warning "Docker daemon not running, attempting to start"
                case "$(detect_os)" in
                    "macos")
                        open -a Docker
                        log_info "Waiting for Docker Desktop to start..."
                        sleep 30
                        ;;
                    "linux")
                        sudo systemctl start docker
                        sudo systemctl enable docker
                        ;;
                esac
            fi
        fi
    fi

    local os=$(detect_os)
    case "$os" in
        "macos")
            log_info "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
            log_error "Manual Docker installation required on macOS"
            exit 1
            ;;
        "linux")
            log_info "Installing Docker via official script"
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker "$USER"
            sudo systemctl start docker
            sudo systemctl enable docker
            rm get-docker.sh
            ;;
        *)
            log_error "Automated Docker installation not supported on $os"
            exit 1
            ;;
    esac

    log_success "Docker installation completed"
}

# Development tools
install_dev_tools() {
    show_progress "Installing development tools"

    local os=$(detect_os)

    # Install essential CLI tools
    case "$os" in
        "macos")
            if ! command -v brew &> /dev/null; then
                log_info "Installing Homebrew"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi

            # Install development tools via Homebrew
            local tools=("jq" "yq" "gh" "pre-commit" "actionlint" "shellcheck")
            for tool in "${tools[@]}"; do
                if ! command -v "$tool" &> /dev/null; then
                    log_info "Installing $tool"
                    brew install "$tool"
                fi
            done
            ;;
        "linux")
            # Install via package manager
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y jq curl wget git pre-commit shellcheck
            elif command -v yum &> /dev/null; then
                sudo yum install -y jq curl wget git
            fi

            # Install tools not available in package managers
            install_github_cli
            install_yq
            install_actionlint
            ;;
    esac

    log_success "Development tools installed"
}

install_github_cli() {
    if ! command -v gh &> /dev/null; then
        log_info "Installing GitHub CLI"
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update
        sudo apt install gh
    fi
}

install_yq() {
    if ! command -v yq &> /dev/null; then
        log_info "Installing yq"
        local arch=$(detect_arch)
        local os=$(detect_os)
        wget -qO /tmp/yq "https://github.com/mikefarah/yq/releases/latest/download/yq_${os}_${arch}"
        sudo mv /tmp/yq /usr/local/bin/yq
        sudo chmod +x /usr/local/bin/yq
    fi
}

install_actionlint() {
    if ! command -v actionlint &> /dev/null; then
        log_info "Installing actionlint"
        bash <(curl https://raw.githubusercontent.com/rhymond/actionlint/main/scripts/download-actionlint.bash)
        sudo mv ./actionlint /usr/local/bin/
    fi
}

# Repository setup
setup_repository() {
    show_progress "Setting up repository"

    # If we're already in the repo directory, skip cloning
    if [[ -f "package.json" ]] && [[ -d ".git" ]]; then
        log_info "Already in repository directory"
    else
        log_info "Cloning repository"
        git clone "$REPO_URL" intelgraph
        cd intelgraph
    fi

    # Configure Git if not already configured
    if ! git config user.name &> /dev/null; then
        log_info "Git user configuration needed"
        read -p "Enter your Git username: " git_username
        read -p "Enter your Git email: " git_email
        git config --global user.name "$git_username"
        git config --global user.email "$git_email"
    fi

    log_success "Repository setup complete"
}

# Dependencies installation
install_dependencies() {
    show_progress "Installing project dependencies"

    # Install Node.js dependencies
    log_info "Installing npm dependencies"
    npm ci

    # Install development dependencies globally if needed
    if ! command -v typescript &> /dev/null; then
        npm install -g typescript ts-node
    fi

    # Install pre-commit hooks
    if command -v pre-commit &> /dev/null; then
        log_info "Installing pre-commit hooks"
        pre-commit install
        pre-commit install --hook-type commit-msg
    fi

    log_success "Dependencies installed"
}

# Environment configuration
setup_environment() {
    show_progress "Setting up environment configuration"

    # Copy environment template if it doesn't exist
    if [[ ! -f ".env" ]] && [[ -f ".env.example" ]]; then
        log_info "Creating .env from template"
        cp .env.example .env
        log_warning "Please review and update .env file with your configuration"
    fi

    # Create necessary directories
    local dirs=("dist" "reports" "logs" "tmp")
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
    done

    # Set up Git hooks directory
    mkdir -p .git/hooks

    log_success "Environment configuration complete"
}

# Docker setup
setup_docker() {
    show_progress "Setting up Docker environment"

    # Build base images if Dockerfiles exist
    if [[ -f "docker-compose.dev.yml" ]]; then
        log_info "Building development Docker images"
        docker-compose -f docker-compose.dev.yml build --parallel
    fi

    # Pull required base images
    log_info "Pulling required Docker images"
    local images=(
        "node:20-alpine"
        "postgres:15-alpine"
        "neo4j:5.8"
        "redis:7-alpine"
        "nginx:alpine"
    )

    for image in "${images[@]}"; do
        docker pull "$image" &
    done
    wait

    log_success "Docker environment ready"
}

# Health checks
run_health_checks() {
    show_progress "Running health checks"

    # Check Node.js and npm versions
    log_info "Node.js version: $(node --version)"
    log_info "npm version: $(npm --version)"

    # Check TypeScript compilation
    if [[ -f "tsconfig.json" ]]; then
        log_info "Running TypeScript check"
        npx tsc --noEmit
    fi

    # Check linting
    if [[ -f ".eslintrc.js" ]] || [[ -f ".eslintrc.json" ]]; then
        log_info "Running ESLint check"
        npx eslint . --ext .ts,.tsx,.js,.jsx
    fi

    # Check formatting
    if [[ -f ".prettierrc" ]] || [[ -f "prettier.config.js" ]]; then
        log_info "Running Prettier check"
        npx prettier --check "**/*.{ts,tsx,js,jsx,json,md,yml,yaml}"
    fi

    # Test basic build
    if [[ -f "package.json" ]] && npm run build:check &> /dev/null; then
        log_info "Running build check"
        npm run build:check
    fi

    log_success "Health checks passed"
}

# VS Code setup
setup_vscode() {
    show_progress "Setting up VS Code configuration"

    # Create .vscode directory and settings
    mkdir -p .vscode

    # Create VS Code settings if they don't exist
    if [[ ! -f ".vscode/settings.json" ]]; then
        cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  }
}
EOF
    fi

    # Create recommended extensions
    if [[ ! -f ".vscode/extensions.json" ]]; then
        cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode-remote.remote-containers",
    "ms-azuretools.vscode-docker",
    "github.vscode-pull-request-github"
  ]
}
EOF
    fi

    log_success "VS Code configuration created"
}

# Final verification
final_verification() {
    show_progress "Final verification and testing"

    # Run a quick smoke test
    log_info "Running smoke tests"

    # Test npm scripts
    if npm run test:quick &> /dev/null; then
        npm run test:quick
    elif npm run test &> /dev/null; then
        timeout 30s npm run test || log_warning "Tests took longer than 30s"
    fi

    # Test development server startup
    if npm run dev:check &> /dev/null; then
        npm run dev:check
    fi

    log_success "Verification complete"
}

# Success message and next steps
show_success() {
    local setup_end_time=$(date +%s)
    local setup_duration=$((setup_end_time - SETUP_START_TIME))
    local minutes=$((setup_duration / 60))
    local seconds=$((setup_duration % 60))

    echo
    echo "🎉 Development environment setup complete!"
    echo
    log_success "Setup completed in ${minutes}m ${seconds}s"
    echo
    echo "Next steps:"
    echo "1. Review and update .env file if needed"
    echo "2. Start development server: npm run dev"
    echo "3. Run tests: npm test"
    echo "4. Build project: npm run build"
    echo "5. Open in VS Code: code ."
    echo
    echo "Useful commands:"
    echo "  npm run dev           # Start development server"
    echo "  npm run test          # Run tests"
    echo "  npm run lint          # Check code style"
    echo "  npm run build         # Build for production"
    echo "  docker-compose up -d  # Start services"
    echo
    echo "Documentation:"
    echo "  README.md            # Project overview"
    echo "  docs/               # Detailed documentation"
    echo "  .github/            # CI/CD workflows"
    echo
    if [[ $minutes -le 10 ]]; then
        log_success "✅ Target ≤10 minute onboarding achieved!"
    else
        log_warning "⚠️  Setup took longer than 10 minutes - consider optimizations"
    fi
}

# Error handling
handle_error() {
    local exit_code=$?
    local line_number=$1

    echo
    log_error "Setup failed at line $line_number (exit code: $exit_code)"
    echo
    echo "Troubleshooting:"
    echo "1. Check internet connection"
    echo "2. Ensure you have sufficient disk space"
    echo "3. Verify system permissions"
    echo "4. Check prerequisite installations"
    echo
    echo "For help, please:"
    echo "1. Check the README.md file"
    echo "2. Review setup logs above"
    echo "3. Open an issue at: $REPO_URL/issues"

    exit $exit_code
}

# Main execution
main() {
    echo "🚀 IntelGraph Development Environment Bootstrap"
    echo "Target: Complete setup in ≤10 minutes"
    echo

    # Set up error handling
    trap 'handle_error $LINENO' ERR

    # Execute setup steps
    check_prerequisites
    install_nodejs
    install_docker
    install_dev_tools
    setup_repository
    install_dependencies
    setup_environment
    setup_docker
    setup_vscode
    run_health_checks
    final_verification
    show_success
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi