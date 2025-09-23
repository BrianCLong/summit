#!/bin/bash

# IntelGraph Platform Startup Script
# Comprehensive startup with verbose logging and health checks

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

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

log_header() {
    echo -e "${PURPLE}[INTELGRAPH]${NC} $1"
}

# Check if running on macOS or Linux
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    else
        OS="unknown"
    fi
    log_info "Detected OS: $OS"
}

# Check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites..."
    
    # Check Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        log_success "Docker found: $DOCKER_VERSION"
    else
        log_error "Docker not found. Please install Docker Desktop."
        exit 1
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version)
        log_success "Docker Compose found: $COMPOSE_VERSION"
    else
        log_error "Docker Compose not found. Please install Docker Compose."
        exit 1
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js found: $NODE_VERSION"
    else
        log_warning "Node.js not found. Using containerized version."
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm found: $NPM_VERSION"
    else
        log_warning "npm not found. Using containerized version."
    fi
}

# Clean up any existing containers
cleanup_containers() {
    log_header "Cleaning up existing containers..."
    
    if docker-compose -f docker-compose.dev.yml ps | grep -q "intelgraph"; then
        log_info "Stopping existing containers..."
        docker-compose -f docker-compose.dev.yml down --remove-orphans
        log_success "Containers stopped and removed"
    else
        log_info "No existing containers found"
    fi
    
    # Clean up any dangling images
    if docker images -f "dangling=true" -q | grep -q .; then
        log_info "Removing dangling images..."
        docker image prune -f
    fi
}

# Build containers
build_containers() {
    log_header "Building containers..."
    
    log_info "Building client container..."
    docker-compose -f docker-compose.dev.yml build client --no-cache
    
    log_info "Building server container..."
    docker-compose -f docker-compose.dev.yml build server --no-cache
    
    log_success "All containers built successfully"
}

# Start services in order
start_services() {
    log_header "Starting services..."
    
    # Start databases first
    log_info "Starting database services..."
    docker-compose -f docker-compose.dev.yml up -d redis postgres neo4j
    
    # Wait for databases to be healthy
    log_info "Waiting for databases to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts"
        
        if docker-compose -f docker-compose.dev.yml ps | grep -E "(redis|postgres|neo4j)" | grep -q "healthy"; then
            log_success "Databases are healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Databases failed to become healthy"
            show_database_logs
            exit 1
        fi
        
        sleep 5
        ((attempt++))
    done
    
    # Start application services
    log_info "Starting application services..."
    docker-compose -f docker-compose.dev.yml up -d server
    
    # Wait for server to be ready
    log_info "Waiting for server to be ready..."
    wait_for_service "server" "http://localhost:4000/health/ready" 60
    
    # Start client
    log_info "Starting client..."
    docker-compose -f docker-compose.dev.yml up -d client
    
    # Wait for client to be ready
    log_info "Waiting for client to be ready..."
    wait_for_service "client" "http://localhost:3000" 60
    
    # Start adminer
    log_info "Starting adminer..."
    docker-compose -f docker-compose.dev.yml up -d adminer
}

# Wait for a service to be ready
wait_for_service() {
    local service_name=$1
    local service_url=$2
    local max_wait=$3
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        if curl -f -s "$service_url" > /dev/null 2>&1; then
            log_success "$service_name is ready at $service_url"
            return 0
        fi
        
        if [ $((wait_time % 10)) -eq 0 ]; then
            log_info "Waiting for $service_name... (${wait_time}s elapsed)"
        fi
        
        sleep 2
        wait_time=$((wait_time + 2))
    done
    
    log_warning "$service_name not ready after ${max_wait}s, but continuing..."
    return 1
}

# Show service logs for debugging
show_database_logs() {
    log_header "Database logs for debugging:"
    
    echo -e "\n${YELLOW}Redis logs:${NC}"
    docker-compose -f docker-compose.dev.yml logs redis --tail 10
    
    echo -e "\n${YELLOW}PostgreSQL logs:${NC}"
    docker-compose -f docker-compose.dev.yml logs postgres --tail 10
    
    echo -e "\n${YELLOW}Neo4j logs:${NC}"
    docker-compose -f docker-compose.dev.yml logs neo4j --tail 10
}

# Show service status
show_service_status() {
    log_header "Service Status:"
    
    echo -e "\nContainer Status:"
    docker-compose -f docker-compose.dev.yml ps
    
    echo -e "\nService Health Check:"
    
    # Check each service
    check_service_health "Frontend" "http://localhost:3000" "React Application"
    check_service_health "Backend" "http://localhost:4000/health/ready" "Server Health"
    check_service_health "Neo4j" "http://localhost:7474" "Graph Database"
    check_service_health "Adminer" "http://localhost:8080" "Database Admin"
    
    echo -e "\nDatabase Connections:"
    check_database_connection "PostgreSQL" "localhost" "5432"
    check_database_connection "Redis" "localhost" "6379"
    check_database_connection "Neo4j" "localhost" "7687"
}

# Check individual service health
check_service_health() {
    local service_name=$1
    local service_url=$2
    local description=$3
    
    if curl -f -s "$service_url" > /dev/null 2>&1; then
        log_success "$service_name ($description): ✓ Available at $service_url"
    else
        log_error "$service_name ($description): ✗ Not available at $service_url"
    fi
}

# Check database connections
check_database_connection() {
    local db_name=$1
    local host=$2
    local port=$3
    
    if nc -z "$host" "$port" 2>/dev/null; then
        log_success "$db_name: ✓ Port $port is open"
    else
        log_error "$db_name: ✗ Port $port is not accessible"
    fi
}

# Show usage information
show_usage_info() {
    log_header "IntelGraph Platform is starting up!"
    
    echo -e "\n${GREEN}🚀 Quick Access URLs:${NC}"
    echo -e "   Frontend:    ${BLUE}http://localhost:3000${NC}     (React Application)"
    echo -e "   Backend:     ${BLUE}http://localhost:4000/graphql${NC} (GraphQL API)"
    echo -e "   Neo4j:       ${BLUE}http://localhost:7474${NC}     (Graph Database UI)"
    echo -e "   Adminer:     ${BLUE}http://localhost:8080${NC}     (Database Admin)"
    
    echo -e "\n${GREEN}🎯 Demo Workflow:${NC}"
    echo -e "   1. Open ${BLUE}http://localhost:3000${NC}"
    echo -e "   2. Navigate to Dashboard"
    echo -e "   3. Create New Investigation"
    echo -e "   4. Add Entities to Graph"
    echo -e "   5. Run Copilot Analysis"
    
    echo -e "\n${GREEN}🔧 Development Commands:${NC}"
    echo -e "   View logs:   ${YELLOW}docker-compose -f docker-compose.dev.yml logs -f${NC}"
    echo -e "   Stop all:    ${YELLOW}docker-compose -f docker-compose.dev.yml down${NC}"
    echo -e "   Restart:     ${YELLOW}./start.sh${NC}"
    
    echo -e "\n${GREEN}📊 System Status:${NC}"
    echo -e "   Check status: ${YELLOW}docker-compose -f docker-compose.dev.yml ps${NC}"
    echo -e "   Monitor logs: ${YELLOW}docker-compose -f docker-compose.dev.yml logs -f [service]${NC}"
}

# Handle cleanup on script exit
cleanup_on_exit() {
    if [ "$1" != "0" ]; then
        log_error "Startup failed. Check logs above for details."
        echo -e "\n${YELLOW}Troubleshooting:${NC}"
        echo -e "   1. Check Docker is running: ${YELLOW}docker --version${NC}"
        echo -e "   2. Check ports are free: ${YELLOW}lsof -i :3000,4000,5432,6379,7474,7687,8080${NC}"
        echo -e "   3. View detailed logs: ${YELLOW}docker-compose -f docker-compose.dev.yml logs${NC}"
        echo -e "   4. Clean restart: ${YELLOW}docker-compose -f docker-compose.dev.yml down && ./start.sh${NC}"
    fi
}

# Main execution
main() {
    trap 'cleanup_on_exit $?' EXIT
    
    clear
    echo -e "${PURPLE}"
    echo "██╗███╗   ██╗████████╗███████╗██╗      ██████╗ ██████╗  █████╗ ██████╗ ██╗  ██╗"
    echo "██║████╗  ██║╚══██╔══╝██╔════╝██║     ██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██║  ██║"
    echo "██║██╔██╗ ██║   ██║   █████╗  ██║     ██║  ███╗██████╔╝███████║██████╔╝███████║"
    echo "██║██║╚██╗██║   ██║   ██╔══╝  ██║     ██║   ██║██╔══██╗██╔══██║██╔═══╝ ██╔══██║"
    echo "██║██║ ╚████║   ██║   ███████╗███████╗╚██████╔╝██║  ██║██║  ██║██║     ██║  ██║"
    echo "╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝"
    echo -e "${NC}"
    echo -e "${BLUE}AI-Augmented Intelligence Analysis Platform${NC}"
    echo -e "${GREEN}Production-Ready MVP • Built with ❤️ for the Intelligence Community${NC}"
    echo ""
    
    detect_os
    check_prerequisites
    cleanup_containers
    build_containers
    start_services
    
    # Small delay to let services fully initialize
    log_info "Allowing services to fully initialize..."
    sleep 10
    
    show_service_status
    show_usage_info
    
    log_success "IntelGraph Platform startup complete!"
    log_info "Press Ctrl+C to view logs in real-time, or run: docker-compose -f docker-compose.dev.yml logs -f"
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi