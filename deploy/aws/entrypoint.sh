#!/bin/sh
# Production entrypoint for Maestro Conductor
# Handles graceful startup, health checks, and shutdown

set -euo pipefail

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $*${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*${NC}" >&2
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $*${NC}" >&2
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $*${NC}"
}

# Configuration defaults
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-8080}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export METRICS_ENABLED="${METRICS_ENABLED:-true}"
export SECURITY_HEADERS_ENABLED="${SECURITY_HEADERS_ENABLED:-true}"

# Health check configuration
export HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-5000}"
export GRACEFUL_SHUTDOWN_TIMEOUT="${GRACEFUL_SHUTDOWN_TIMEOUT:-30000}"

# Performance tuning for container environment
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512 --optimize-for-size}"

# Security: Prevent core dumps
ulimit -c 0

log "🚀 Starting Maestro Conductor"
log "Environment: $NODE_ENV"
log "Port: $PORT"
log "Log Level: $LOG_LEVEL"

# Validate required environment
if [[ "$NODE_ENV" != "production" && "$NODE_ENV" != "staging" && "$NODE_ENV" != "development" ]]; then
    log_error "Invalid NODE_ENV: $NODE_ENV. Must be production, staging, or development"
    exit 1
fi

# Pre-flight checks
log "🔍 Running pre-flight checks..."

# Check if server files exist
if [[ ! -f "./server/index.js" ]]; then
    log_error "Server application not found at ./server/index.js"
    exit 1
fi

# Check port availability
if command -v netstat >/dev/null 2>&1; then
    if netstat -tuln | grep -q ":$PORT "; then
        log_error "Port $PORT is already in use"
        exit 1
    fi
fi

# Validate configuration
if [[ -n "${DATABASE_URL:-}" ]]; then
    log "Database URL configured"
else
    log_warn "DATABASE_URL not set - using in-memory storage"
fi

if [[ -n "${REDIS_URL:-}" ]]; then
    log "Redis URL configured"
else
    log_warn "REDIS_URL not set - caching disabled"
fi

# Setup signal handlers for graceful shutdown
cleanup() {
    log "🛑 Received shutdown signal, performing graceful shutdown..."
    
    if [[ -n "${APP_PID:-}" ]]; then
        log "Stopping application (PID: $APP_PID)..."
        
        # Send TERM signal to application
        kill -TERM "$APP_PID" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local timeout=$((GRACEFUL_SHUTDOWN_TIMEOUT / 1000))
        local count=0
        
        while kill -0 "$APP_PID" 2>/dev/null && [[ $count -lt $timeout ]]; do
            sleep 1
            count=$((count + 1))
            
            if [[ $((count % 5)) -eq 0 ]]; then
                log "Waiting for graceful shutdown... (${count}s/${timeout}s)"
            fi
        done
        
        # Force kill if still running
        if kill -0 "$APP_PID" 2>/dev/null; then
            log_warn "Graceful shutdown timeout, forcing termination"
            kill -KILL "$APP_PID" 2>/dev/null || true
        fi
    fi
    
    log_success "Shutdown complete"
    exit 0
}

trap cleanup TERM INT QUIT

# Create required directories
mkdir -p /app/logs /app/tmp /app/data

# Set proper permissions (defensive)
chmod 755 /app/logs /app/tmp /app/data

log "📁 Working directory: $(pwd)"
log "👤 Running as: $(id)"

# Start the application in the background
log "🎭 Starting Maestro Conductor application..."

cd ./server

# Export additional runtime configuration
export CLUSTER_MODE="${CLUSTER_MODE:-false}"
export WORKER_PROCESSES="${WORKER_PROCESSES:-1}"

# Performance monitoring
if [[ "${ENABLE_PROFILING:-false}" == "true" ]]; then
    export NODE_OPTIONS="$NODE_OPTIONS --inspect=0.0.0.0:9229"
    log "🔍 Profiling enabled on port 9229"
fi

# Start the Node.js application
node index.js &
APP_PID=$!

log_success "Application started with PID: $APP_PID"

# Health check loop
log "❤️ Starting health monitoring..."

health_check() {
    if curl -f -s "http://localhost:$PORT/healthz" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Initial startup health check
log "⏳ Waiting for application to be ready..."
local startup_timeout=60
local count=0

while ! health_check && [[ $count -lt $startup_timeout ]]; do
    sleep 1
    count=$((count + 1))
    
    if [[ $((count % 10)) -eq 0 ]]; then
        log "Still waiting for startup... (${count}s/${startup_timeout}s)"
    fi
    
    # Check if process is still running
    if ! kill -0 "$APP_PID" 2>/dev/null; then
        log_error "Application process died during startup"
        exit 1
    fi
done

if health_check; then
    log_success "✅ Application is ready and healthy!"
    log_success "🌐 Maestro Conductor is serving on port $PORT"
else
    log_error "❌ Application failed health check after ${startup_timeout}s"
    exit 1
fi

# Continuous health monitoring
monitor_health() {
    local failures=0
    local max_failures=3
    
    while true; do
        sleep 30
        
        if health_check; then
            failures=0
        else
            failures=$((failures + 1))
            log_warn "Health check failed ($failures/$max_failures)"
            
            if [[ $failures -ge $max_failures ]]; then
                log_error "Health check failed $max_failures times, initiating shutdown"
                cleanup
            fi
        fi
        
        # Check if main process is still running
        if ! kill -0 "$APP_PID" 2>/dev/null; then
            log_error "Main application process died"
            exit 1
        fi
    done
}

# Start health monitoring in background
monitor_health &
HEALTH_PID=$!

# Log system information
log "📊 System Information:"
log "   Memory: $(cat /proc/meminfo | grep MemAvailable | awk '{print $2 $3}') available"
log "   CPU Cores: $(nproc)"
log "   Disk Space: $(df -h /app | tail -1 | awk '{print $4}') available"

# Display startup banner
log_success "╔══════════════════════════════════════════════════════════════╗"
log_success "║                 🎭 Maestro Conductor Ready                   ║"
log_success "╠══════════════════════════════════════════════════════════════╣"
log_success "║ Environment:     $NODE_ENV"
log_success "║ Port:            $PORT"
log_success "║ Health Endpoint: http://localhost:$PORT/healthz"
log_success "║ Metrics:         http://localhost:$PORT/metrics"
log_success "║ Process ID:      $APP_PID"
log_success "╚══════════════════════════════════════════════════════════════╝"

# Wait for main process to exit
wait $APP_PID
EXIT_CODE=$?

# Cleanup health monitor
kill "$HEALTH_PID" 2>/dev/null || true

if [[ $EXIT_CODE -eq 0 ]]; then
    log_success "Application exited cleanly"
else
    log_error "Application exited with code $EXIT_CODE"
fi

exit $EXIT_CODE