#!/bin/bash
set -e

echo "🚀 IntelGraph Platform Setup"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. Some features may not work."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_warning "Docker Compose is not installed. Some features may not work."
    fi
    
    log_success "Prerequisites check completed"
}

# Setup environment file
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Created .env from .env.example"
            log_warning "Please update .env with your configuration"
        else
            log_error ".env.example not found"
            exit 1
        fi
    else
        log_info ".env already exists"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Root dependencies
    log_info "Installing root dependencies..."
    npm install
    
    # Server dependencies
    if [ -d "server" ]; then
        log_info "Installing server dependencies..."
        cd server
        npm install
        cd ..
    fi
    
    # Client dependencies
    if [ -d "client" ]; then
        log_info "Installing client dependencies..."
        cd client
        npm install
        cd ..
    fi
    
    log_success "Dependencies installed successfully"
}

# Setup Git hooks
setup_git_hooks() {
    log_info "Setting up Git hooks..."
    
    if command -v git &> /dev/null; then
        if [ -d ".git" ]; then
            npx husky install
            log_success "Git hooks configured"
        else
            log_warning "Not a Git repository. Skipping Git hooks setup."
        fi
    else
        log_warning "Git not installed. Skipping Git hooks setup."
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p uploads
    mkdir -p backups
    mkdir -p temp
    
    log_success "Directories created"
}

# Setup databases (if Docker is available)
setup_databases() {
    if command -v docker-compose &> /dev/null; then
        log_info "Setting up development databases..."
        
        # Check if Docker daemon is running
        if ! docker info &> /dev/null; then
            log_warning "Docker daemon is not running. Please start Docker first."
            return
        fi
        
        log_info "Starting development databases..."
        docker-compose -f docker-compose.dev.yml up -d neo4j postgres redis
        
        log_info "Waiting for databases to be ready..."
        sleep 30
        
        log_success "Development databases are running"
        log_info "Neo4j Browser: http://localhost:7474"
        log_info "Database Admin: http://localhost:8080"
    else
        log_warning "Docker Compose not available. Please set up databases manually."
    fi
}

# Main setup process
main() {
    echo
    log_info "Starting IntelGraph Platform setup..."
    echo
    
    check_prerequisites
    setup_environment
    install_dependencies
    setup_git_hooks
    create_directories
    setup_databases
    
    echo
    log_success "🎉 Setup completed successfully!"
    echo
    log_info "Next steps:"
    echo "  1. Update .env with your configuration"
    echo "  2. Run 'npm run dev' to start development servers"
    echo "  3. Open http://localhost:3000 in your browser"
    echo
    log_info "Useful commands:"
    echo "  • npm run dev          - Start development servers"
    echo "  • npm run docker:dev   - Start with Docker"
    echo "  • npm run test         - Run all tests"
    echo "  • npm run lint         - Run code linting"
    echo "  • npm run build        - Build for production"
    echo
}

# Run main function
main "$@"
