#!/bin/sh

# Health Monitor for IntelGraph Load Balancer
# Monitors application health and manages circuit breaking

set -e

# Configuration
MONITOR_INTERVAL=${MONITOR_INTERVAL:-30}
HEALTH_ENDPOINT=${HEALTH_ENDPOINT:-http://nginx/health}
ALERT_WEBHOOK_URL=${ALERT_WEBHOOK_URL}
FAILURE_THRESHOLD=${FAILURE_THRESHOLD:-3}
RECOVERY_THRESHOLD=${RECOVERY_THRESHOLD:-2}
CIRCUIT_BREAKER_TIMEOUT=${CIRCUIT_BREAKER_TIMEOUT:-300}

# State variables
CONSECUTIVE_FAILURES=0
CONSECUTIVE_SUCCESSES=0
CIRCUIT_STATE="CLOSED"  # CLOSED, OPEN, HALF_OPEN
CIRCUIT_OPENED_AT=0

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] HEALTH-MONITOR: $1"
}

check_health() {
    local endpoint=$1
    local timeout=${2:-5}
    
    # Use curl to check health endpoint
    if curl -f -m $timeout -s "$endpoint" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

check_database_health() {
    # Check individual database components
    local postgres_health=0
    local redis_health=0
    local neo4j_health=0
    
    # PostgreSQL health check
    if docker exec intelgraph-postgres-prod pg_isready -U ${POSTGRES_USER} >/dev/null 2>&1; then
        postgres_health=1
    fi
    
    # Redis health check
    if docker exec intelgraph-redis-prod redis-cli ping | grep -q PONG; then
        redis_health=1
    fi
    
    # Neo4j health check (simplified)
    if docker exec intelgraph-neo4j-prod cypher-shell -u neo4j -p ${NEO4J_PASSWORD} "RETURN 1" >/dev/null 2>&1; then
        neo4j_health=1
    fi
    
    echo "postgres:$postgres_health,redis:$redis_health,neo4j:$neo4j_health"
}

get_circuit_state() {
    echo $CIRCUIT_STATE
}

open_circuit() {
    if [ "$CIRCUIT_STATE" != "OPEN" ]; then
        CIRCUIT_STATE="OPEN"
        CIRCUIT_OPENED_AT=$(date +%s)
        log "Circuit breaker OPENED - Health checks failing"
        send_alert "CRITICAL" "IntelGraph circuit breaker opened - service may be down"
        
        # Optionally redirect traffic to maintenance page
        # update_nginx_maintenance_mode "enabled"
    fi
}

close_circuit() {
    if [ "$CIRCUIT_STATE" != "CLOSED" ]; then
        CIRCUIT_STATE="CLOSED"
        CONSECUTIVE_FAILURES=0
        CONSECUTIVE_SUCCESSES=0
        log "Circuit breaker CLOSED - Service recovered"
        send_alert "INFO" "IntelGraph circuit breaker closed - service recovered"
        
        # Restore normal traffic routing
        # update_nginx_maintenance_mode "disabled"
    fi
}

half_open_circuit() {
    if [ "$CIRCUIT_STATE" = "OPEN" ]; then
        CIRCUIT_STATE="HALF_OPEN"
        log "Circuit breaker HALF-OPEN - Testing service recovery"
    fi
}

should_attempt_reset() {
    if [ "$CIRCUIT_STATE" = "OPEN" ]; then
        local now=$(date +%s)
        local time_since_open=$((now - CIRCUIT_OPENED_AT))
        if [ $time_since_open -ge $CIRCUIT_BREAKER_TIMEOUT ]; then
            return 0
        fi
    fi
    return 1
}

send_alert() {
    local severity=$1
    local message=$2
    local timestamp=$(date -Iseconds)
    
    log "$severity: $message"
    
    if [ ! -z "$ALERT_WEBHOOK_URL" ]; then
        local payload=$(cat <<EOF
{
    "severity": "$severity",
    "message": "$message",
    "timestamp": "$timestamp",
    "service": "IntelGraph",
    "component": "health-monitor",
    "circuit_state": "$CIRCUIT_STATE",
    "consecutive_failures": $CONSECUTIVE_FAILURES,
    "consecutive_successes": $CONSECUTIVE_SUCCESSES
}
EOF
)
        
        curl -X POST "$ALERT_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "$payload" \
             2>/dev/null || log "Failed to send alert webhook"
    fi
}

get_detailed_health() {
    # Get detailed health information
    local app_health=""
    local db_health=""
    local response_time=""
    
    # Check application response time
    local start_time=$(date +%s%N)
    if check_health "$HEALTH_ENDPOINT" 10; then
        local end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        app_health="healthy"
    else
        app_health="unhealthy"
        response_time="-1"
    fi
    
    # Check database health
    db_health=$(check_database_health)
    
    echo "app:$app_health,response_time:${response_time}ms,databases:$db_health"
}

process_health_check() {
    local health_details=$(get_detailed_health)
    log "Health check: $health_details"
    
    if check_health "$HEALTH_ENDPOINT"; then
        # Health check passed
        case $CIRCUIT_STATE in
            "CLOSED")
                CONSECUTIVE_FAILURES=0
                ;;
            "HALF_OPEN")
                CONSECUTIVE_SUCCESSES=$((CONSECUTIVE_SUCCESSES + 1))
                if [ $CONSECUTIVE_SUCCESSES -ge $RECOVERY_THRESHOLD ]; then
                    close_circuit
                fi
                ;;
            "OPEN")
                # Should not happen, but reset if it does
                if should_attempt_reset; then
                    half_open_circuit
                fi
                ;;
        esac
    else
        # Health check failed
        case $CIRCUIT_STATE in
            "CLOSED")
                CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
                if [ $CONSECUTIVE_FAILURES -ge $FAILURE_THRESHOLD ]; then
                    open_circuit
                fi
                ;;
            "HALF_OPEN")
                # Failure during half-open, go back to open
                open_circuit
                CONSECUTIVE_SUCCESSES=0
                ;;
            "OPEN")
                # Already open, just log
                log "Health check failed while circuit is open"
                ;;
        esac
        
        # Send warning after first failure
        if [ $CONSECUTIVE_FAILURES -eq 1 ] && [ "$CIRCUIT_STATE" = "CLOSED" ]; then
            send_alert "WARNING" "IntelGraph health check failed (1/$FAILURE_THRESHOLD)"
        fi
    fi
    
    # Check if we should attempt to reset from OPEN state
    if should_attempt_reset; then
        half_open_circuit
    fi
}

monitor_resource_usage() {
    # Monitor system resources and send alerts
    local cpu_usage=""
    local memory_usage=""
    local disk_usage=""
    
    # Get system metrics (simplified)
    if command -v docker >/dev/null 2>&1; then
        # Get Docker stats if available
        local docker_stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemPerc}}" 2>/dev/null | tail -n +2 | head -1)
        if [ ! -z "$docker_stats" ]; then
            cpu_usage=$(echo $docker_stats | cut -d' ' -f1)
            memory_usage=$(echo $docker_stats | cut -d' ' -f2)
        fi
    fi
    
    # Check for resource alerts
    if [ ! -z "$cpu_usage" ]; then
        local cpu_num=$(echo $cpu_usage | sed 's/%//')
        if [ $(echo "$cpu_num > 90" | bc 2>/dev/null || echo 0) -eq 1 ]; then
            send_alert "WARNING" "High CPU usage detected: $cpu_usage"
        fi
    fi
    
    if [ ! -z "$memory_usage" ]; then
        local mem_num=$(echo $memory_usage | sed 's/%//')
        if [ $(echo "$mem_num > 90" | bc 2>/dev/null || echo 0) -eq 1 ]; then
            send_alert "WARNING" "High memory usage detected: $memory_usage"
        fi
    fi
}

generate_health_report() {
    # Generate periodic health report
    local uptime=$(cat /proc/uptime 2>/dev/null | cut -d' ' -f1 || echo "unknown")
    local timestamp=$(date -Iseconds)
    
    cat <<EOF
{
    "timestamp": "$timestamp",
    "circuit_state": "$CIRCUIT_STATE",
    "consecutive_failures": $CONSECUTIVE_FAILURES,
    "consecutive_successes": $CONSECUTIVE_SUCCESSES,
    "uptime_seconds": "$uptime",
    "monitor_interval": $MONITOR_INTERVAL,
    "thresholds": {
        "failure": $FAILURE_THRESHOLD,
        "recovery": $RECOVERY_THRESHOLD,
        "timeout": $CIRCUIT_BREAKER_TIMEOUT
    }
}
EOF
}

# Install required tools
apk add --no-cache curl bc

log "Starting IntelGraph health monitor"
log "Configuration: endpoint=$HEALTH_ENDPOINT, interval=${MONITOR_INTERVAL}s"
log "Thresholds: failure=$FAILURE_THRESHOLD, recovery=$RECOVERY_THRESHOLD"
log "Circuit breaker timeout: ${CIRCUIT_BREAKER_TIMEOUT}s"

# Send startup notification
send_alert "INFO" "IntelGraph health monitor started"

# Health report counter
HEALTH_REPORT_COUNTER=0
HEALTH_REPORT_INTERVAL=20 # Send detailed report every 20 checks

# Main monitoring loop
while true; do
    process_health_check
    
    # Monitor resource usage every few checks
    if [ $((HEALTH_REPORT_COUNTER % 5)) -eq 0 ]; then
        monitor_resource_usage
    fi
    
    # Send detailed health report periodically
    if [ $((HEALTH_REPORT_COUNTER % HEALTH_REPORT_INTERVAL)) -eq 0 ]; then
        local report=$(generate_health_report)
        log "Health report: $report"
    fi
    
    HEALTH_REPORT_COUNTER=$((HEALTH_REPORT_COUNTER + 1))
    
    sleep $MONITOR_INTERVAL
done