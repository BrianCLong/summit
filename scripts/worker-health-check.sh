#!/bin/bash

# Worker Health Check Script
# Used by Kubernetes liveness and readiness probes

set -e

# Configuration
WORKER_PORT=${WORKER_PORT:-8080}
HEALTH_ENDPOINT="http://localhost:${WORKER_PORT}/health"
TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to perform health check
check_worker_health() {
    local response
    local http_code
    local start_time
    local end_time
    local duration
    
    start_time=$(date +%s.%N)
    
    # Make HTTP request with timeout
    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s -w "%{http_code}" -m "$TIMEOUT" "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
        http_code="${response: -3}"
        response="${response%???}"
    else
        log "${RED}ERROR: curl not available${NC}"
        return 1
    fi
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0.0")
    
    # Check HTTP status code
    if [[ "$http_code" == "200" ]]; then
        # Parse JSON response to check worker status
        if command -v jq >/dev/null 2>&1; then
            local worker_status
            worker_status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "unknown")
            
            if [[ "$worker_status" == "running" ]]; then
                log "${GREEN}Worker health check PASSED${NC} (${duration}s, status: $worker_status)"
                return 0
            else
                log "${RED}Worker health check FAILED${NC}: Worker status is $worker_status"
                return 1
            fi
        else
            # No jq available, just check HTTP 200
            log "${YELLOW}Worker health check PASSED${NC} (${duration}s, no JSON validation)"
            return 0
        fi
    else
        log "${RED}Worker health check FAILED${NC}: HTTP $http_code (${duration}s)"
        return 1
    fi
}

# Function to check worker metrics
check_worker_metrics() {
    local metrics_endpoint="http://localhost:${WORKER_PORT}/metrics"
    local response
    local http_code
    
    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s -w "%{http_code}" -m "$TIMEOUT" "$metrics_endpoint" 2>/dev/null || echo "000")
        http_code="${response: -3}"
        
        if [[ "$http_code" == "200" ]]; then
            log "${GREEN}Worker metrics endpoint accessible${NC}"
            return 0
        else
            log "${YELLOW}Worker metrics endpoint returned HTTP $http_code${NC}"
            return 1
        fi
    else
        return 1
    fi
}

# Function to check process health
check_process_health() {
    # Check if worker process is consuming reasonable CPU/memory
    local pid=${WORKER_PID:-$$}
    
    if [[ -f "/proc/${pid}/status" ]]; then
        local vmrss
        vmrss=$(grep '^VmRSS:' "/proc/${pid}/status" 2>/dev/null | awk '{print $2}' || echo "0")
        
        # Convert KB to MB
        local memory_mb=$((vmrss / 1024))
        
        # Check if memory usage is reasonable (less than 2GB for workers)
        if [[ "$memory_mb" -gt 2048 ]]; then
            log "${YELLOW}High memory usage detected: ${memory_mb}MB${NC}"
        else
            log "Memory usage: ${memory_mb}MB"
        fi
        
        return 0
    else
        log "${YELLOW}Cannot check process memory${NC}"
        return 0
    fi
}

# Main health check function
main() {
    local exit_code=0
    
    log "Starting worker health check..."
    log "Health endpoint: $HEALTH_ENDPOINT"
    log "Timeout: ${TIMEOUT}s"
    
    # Basic health check
    if ! check_worker_health; then
        exit_code=1
    fi
    
    # Optional metrics check (don't fail on this)
    check_worker_metrics || true
    
    # Optional process health check (don't fail on this)
    check_process_health || true
    
    if [[ "$exit_code" -eq 0 ]]; then
        log "${GREEN}Overall health check PASSED${NC}"
    else
        log "${RED}Overall health check FAILED${NC}"
    fi
    
    exit "$exit_code"
}

# Handle script arguments
case "${1:-check}" in
    "check")
        main
        ;;
    "metrics")
        check_worker_metrics
        ;;
    "process")
        check_process_health
        ;;
    "help"|"-h"|"--help")
        echo "Worker Health Check Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  check     - Full health check (default)"
        echo "  metrics   - Check metrics endpoint only"
        echo "  process   - Check process health only"
        echo "  help      - Show this help"
        echo ""
        echo "Environment Variables:"
        echo "  WORKER_PORT              - Worker health port (default: 8080)"
        echo "  HEALTH_CHECK_TIMEOUT     - Request timeout in seconds (default: 10)"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac