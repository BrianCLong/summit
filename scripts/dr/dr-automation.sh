#!/bin/bash
set -euo pipefail

# Disaster Recovery Automation Script for Maestro Conductor
# Provides automated disaster detection, escalation, and initial recovery steps

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-intelgraph-prod}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-https://maestro.intelgraph.ai/health}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
DR_MODE="${DR_MODE:-detection}"
MAX_RECOVERY_ATTEMPTS="${MAX_RECOVERY_ATTEMPTS:-3}"
RECOVERY_TIMEOUT="${RECOVERY_TIMEOUT:-1800}" # 30 minutes

# State tracking
INCIDENT_ID=""
INCIDENT_SEVERITY=""
RECOVERY_ATTEMPT=0
START_TIME=$(date +%s)

log() { printf "${BLUE}[DR-AUTO]${NC} %s\n" "$*"; }
success() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
error() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }
critical() { printf "${RED}🚨 %s${NC}\n" "$*"; }

show_usage() {
    echo "Disaster Recovery Automation Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --mode MODE              DR mode: detection|recovery|monitoring|test (default: detection)"
    echo "  --namespace NAMESPACE    Kubernetes namespace (default: intelgraph-prod)"
    echo "  --health-endpoint URL    Health check endpoint"
    echo "  --incident-id ID         Existing incident ID (for recovery mode)"
    echo "  --severity LEVEL         Incident severity: critical|high|medium|low"
    echo "  --max-attempts N         Maximum recovery attempts (default: 3)"
    echo "  --timeout SECONDS        Recovery timeout in seconds (default: 1800)"
    echo "  --help                   Show this help message"
    echo ""
    echo "Modes:"
    echo "  detection   - Continuous health monitoring and incident detection"
    echo "  recovery    - Execute automated recovery procedures"
    echo "  monitoring  - Post-recovery monitoring and validation"
    echo "  test        - Test disaster recovery procedures (safe mode)"
    echo ""
    echo "Examples:"
    echo "  $0 --mode detection"
    echo "  $0 --mode recovery --incident-id INC-001 --severity critical"
    echo "  $0 --mode test --namespace intelgraph-staging"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            DR_MODE="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --health-endpoint)
            HEALTH_ENDPOINT="$2"
            shift 2
            ;;
        --incident-id)
            INCIDENT_ID="$2"
            shift 2
            ;;
        --severity)
            INCIDENT_SEVERITY="$2"
            shift 2
            ;;
        --max-attempts)
            MAX_RECOVERY_ATTEMPTS="$2"
            shift 2
            ;;
        --timeout)
            RECOVERY_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate DR mode
if [[ ! "$DR_MODE" =~ ^(detection|recovery|monitoring|test)$ ]]; then
    error "Invalid DR mode: $DR_MODE"
    show_usage
    exit 1
fi

generate_incident_id() {
    INCIDENT_ID="INC-$(date +%Y%m%d%H%M%S)-$(printf "%04d" $RANDOM)"
    echo "$INCIDENT_ID"
}

send_alert() {
    local message="$1"
    local severity="${2:-medium}"
    local channel="${3:-general}"
    
    log "📢 Sending alert: $severity"
    
    # Send to Slack if webhook configured
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="warning"
        case $severity in
            critical) color="danger" ;;
            high) color="warning" ;;
            medium) color="good" ;;
            low) color="#439FE0" ;;
        esac
        
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data '{
                "channel": "#'$channel'",
                "username": "Maestro DR Bot",
                "icon_emoji": ":rotating_light:",
                "attachments": [{
                    "color": "'$color'",
                    "title": "🚨 Maestro Conductor - '$severity' Alert",
                    "text": "'"$message"'",
                    "fields": [
                        {
                            "title": "Incident ID",
                            "value": "'"$INCIDENT_ID"'",
                            "short": true
                        },
                        {
                            "title": "Namespace",
                            "value": "'"$NAMESPACE"'",
                            "short": true
                        },
                        {
                            "title": "Timestamp",
                            "value": "'"$(date -u +"%Y-%m-%d %H:%M:%S UTC")"'",
                            "short": true
                        }
                    ]
                }]
            }' >/dev/null 2>&1 || warn "Failed to send Slack notification"
    fi
    
    # Send to generic webhook if configured
    if [[ -n "$ALERT_WEBHOOK" ]]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            --data '{
                "incident_id": "'"$INCIDENT_ID"'",
                "severity": "'"$severity"'",
                "message": "'"$message"'",
                "namespace": "'"$NAMESPACE"'",
                "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
                "source": "maestro-dr-automation"
            }' >/dev/null 2>&1 || warn "Failed to send webhook notification"
    fi
    
    # Log to system log
    logger -t "maestro-dr" "[$severity] $message (Incident: $INCIDENT_ID)"
}

check_system_health() {
    log "🏥 Performing comprehensive health check..."
    
    local health_score=0
    local max_score=100
    local issues=()
    
    # Check primary health endpoint (20 points)
    if curl -sf --max-time 10 "$HEALTH_ENDPOINT" >/dev/null 2>&1; then
        ((health_score += 20))
        success "Primary health endpoint responding"
    else
        issues+=("Primary health endpoint not responding")
        error "Primary health endpoint not responding"
    fi
    
    # Check Kubernetes pods (25 points)
    local running_pods
    local total_pods
    running_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l || echo "0")
    total_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "1")
    
    if [[ $total_pods -gt 0 ]]; then
        local pod_percentage=$((running_pods * 100 / total_pods))
        if [[ $pod_percentage -ge 80 ]]; then
            ((health_score += 25))
            success "$running_pods/$total_pods pods running ($pod_percentage%)"
        elif [[ $pod_percentage -ge 50 ]]; then
            ((health_score += 15))
            warn "$running_pods/$total_pods pods running ($pod_percentage%)"
        else
            issues+=("Too many pods not running: $running_pods/$total_pods")
            error "$running_pods/$total_pods pods running ($pod_percentage%)"
        fi
    fi
    
    # Check services (15 points)
    local services_count
    services_count=$(kubectl get services -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
    if [[ $services_count -gt 0 ]]; then
        ((health_score += 15))
        success "$services_count services available"
    else
        issues+=("No services found")
        error "No services found"
    fi
    
    # Check ingress (10 points)
    local ingress_count
    ingress_count=$(kubectl get ingress -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
    if [[ $ingress_count -gt 0 ]]; then
        ((health_score += 10))
        success "$ingress_count ingress resources configured"
    else
        issues+=("No ingress resources found")
        warn "No ingress resources found"
    fi
    
    # Check database connectivity (15 points)
    if curl -sf --max-time 5 "${HEALTH_ENDPOINT%/health}/api/resilience/health" >/dev/null 2>&1; then
        ((health_score += 15))
        success "Database connectivity verified"
    else
        issues+=("Database connectivity issues detected")
        error "Database connectivity issues detected"
    fi
    
    # Check circuit breakers (10 points)
    local circuit_breaker_data
    if circuit_breaker_data=$(curl -sf --max-time 5 "${HEALTH_ENDPOINT%/health}/api/resilience/circuit-breakers" 2>/dev/null); then
        local open_circuits
        open_circuits=$(echo "$circuit_breaker_data" | jq -r '[.circuitBreakers | to_entries[] | select(.value.state == "OPEN")] | length' 2>/dev/null || echo "0")
        
        if [[ $open_circuits -eq 0 ]]; then
            ((health_score += 10))
            success "All circuit breakers closed"
        else
            issues+=("$open_circuits circuit breakers are open")
            warn "$open_circuits circuit breakers are open"
            ((health_score += 5))
        fi
    else
        issues+=("Cannot check circuit breaker status")
        warn "Cannot check circuit breaker status"
    fi
    
    # Check resource utilization (5 points)
    local high_cpu_pods
    high_cpu_pods=$(kubectl top pods -n "$NAMESPACE" --no-headers 2>/dev/null | awk '$3 ~ /[0-9]+%/ && substr($3,1,length($3)-1) > 80 { print $1 }' | wc -l || echo "0")
    
    if [[ $high_cpu_pods -eq 0 ]]; then
        ((health_score += 5))
        success "Resource utilization normal"
    else
        issues+=("$high_cpu_pods pods with high CPU usage")
        warn "$high_cpu_pods pods with high CPU usage"
        ((health_score += 2))
    fi
    
    # Determine system status based on health score
    local status="HEALTHY"
    local severity="low"
    
    if [[ $health_score -ge 90 ]]; then
        status="HEALTHY"
        severity="low"
    elif [[ $health_score -ge 70 ]]; then
        status="DEGRADED"
        severity="medium"
    elif [[ $health_score -ge 50 ]]; then
        status="UNHEALTHY"
        severity="high"
    else
        status="CRITICAL"
        severity="critical"
    fi
    
    echo ""
    log "🏥 Health Check Summary:"
    log "   Status: $status"
    log "   Score: $health_score/$max_score ($((health_score * 100 / max_score))%)"
    
    if [[ ${#issues[@]} -gt 0 ]]; then
        log "   Issues detected:"
        for issue in "${issues[@]}"; do
            log "     - $issue"
        done
    fi
    
    # Return health score and status
    export SYSTEM_HEALTH_SCORE=$health_score
    export SYSTEM_STATUS=$status
    export INCIDENT_SEVERITY=$severity
    
    return $((100 - health_score))
}

detect_incidents() {
    log "🔍 Starting incident detection monitoring..."
    
    local consecutive_failures=0
    local max_consecutive_failures=3
    local check_interval=30
    
    while true; do
        if check_system_health; then
            # System is healthy
            if [[ $consecutive_failures -gt 0 ]]; then
                log "System recovered after $consecutive_failures failures"
                consecutive_failures=0
            fi
        else
            ((consecutive_failures++))
            warn "Health check failed ($consecutive_failures/$max_consecutive_failures)"
            
            if [[ $consecutive_failures -ge $max_consecutive_failures ]]; then
                # Incident detected
                INCIDENT_ID=$(generate_incident_id)
                critical "🚨 INCIDENT DETECTED - $INCIDENT_ID"
                
                local incident_message="System health degraded. Status: $SYSTEM_STATUS, Score: $SYSTEM_HEALTH_SCORE/100"
                send_alert "$incident_message" "$INCIDENT_SEVERITY" "alerts"
                
                # Trigger automated recovery if enabled
                if [[ "${AUTO_RECOVERY:-false}" == "true" ]]; then
                    log "Triggering automated recovery..."
                    execute_recovery_procedures
                fi
                
                # Reset counter after incident declaration
                consecutive_failures=0
            fi
        fi
        
        sleep $check_interval
    done
}

execute_recovery_procedures() {
    log "🔧 Starting automated recovery procedures..."
    
    ((RECOVERY_ATTEMPT++))
    
    if [[ $RECOVERY_ATTEMPT -gt $MAX_RECOVERY_ATTEMPTS ]]; then
        critical "Maximum recovery attempts ($MAX_RECOVERY_ATTEMPTS) exceeded"
        send_alert "Automated recovery failed after $MAX_RECOVERY_ATTEMPTS attempts. Manual intervention required." "critical" "incidents"
        return 1
    fi
    
    local recovery_start_time=$(date +%s)
    local recovery_success=false
    
    log "Recovery attempt $RECOVERY_ATTEMPT/$MAX_RECOVERY_ATTEMPTS"
    send_alert "Starting recovery attempt $RECOVERY_ATTEMPT/$MAX_RECOVERY_ATTEMPTS" "high" "incidents"
    
    # Recovery Step 1: Restart unhealthy pods
    if restart_unhealthy_pods; then
        success "Unhealthy pods restarted"
    else
        error "Failed to restart unhealthy pods"
    fi
    
    # Recovery Step 2: Check and reset circuit breakers
    if reset_circuit_breakers; then
        success "Circuit breakers reset"
    else
        error "Failed to reset circuit breakers"
    fi
    
    # Recovery Step 3: Validate database connections
    if validate_database_connections; then
        success "Database connections validated"
    else
        error "Database validation failed"
    fi
    
    # Recovery Step 4: Scale services if needed
    if scale_services_if_needed; then
        success "Services scaled appropriately"
    else
        error "Failed to scale services"
    fi
    
    # Wait for system to stabilize
    log "Waiting for system to stabilize..."
    sleep 60
    
    # Verify recovery
    if check_system_health && [[ $SYSTEM_HEALTH_SCORE -ge 80 ]]; then
        recovery_success=true
        local recovery_duration=$(($(date +%s) - recovery_start_time))
        success "🎉 Recovery successful in ${recovery_duration} seconds"
        send_alert "Automated recovery successful in ${recovery_duration} seconds. System health score: $SYSTEM_HEALTH_SCORE/100" "medium" "incidents"
        RECOVERY_ATTEMPT=0  # Reset counter on success
    else
        error "Recovery verification failed"
        send_alert "Recovery attempt $RECOVERY_ATTEMPT failed. System health score: $SYSTEM_HEALTH_SCORE/100" "high" "incidents"
        
        # Try again if within limits
        if [[ $RECOVERY_ATTEMPT -lt $MAX_RECOVERY_ATTEMPTS ]]; then
            log "Scheduling next recovery attempt..."
            sleep 300  # Wait 5 minutes before retry
            execute_recovery_procedures
        fi
    fi
    
    return $([[ "$recovery_success" == "true" ]] && echo 0 || echo 1)
}

restart_unhealthy_pods() {
    log "🔄 Restarting unhealthy pods..."
    
    # Find pods that are not running or ready
    local unhealthy_pods
    unhealthy_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers | awk '$3 !~ /Running/ || $2 !~ /.*\/.*/ { print $1 }')
    
    if [[ -z "$unhealthy_pods" ]]; then
        log "No unhealthy pods found"
        return 0
    fi
    
    log "Found unhealthy pods: $(echo "$unhealthy_pods" | tr '\n' ' ')"
    
    # Delete unhealthy pods (they will be recreated by deployments/statefulsets)
    echo "$unhealthy_pods" | while read -r pod; do
        [[ -n "$pod" ]] && kubectl delete pod "$pod" -n "$NAMESPACE" --grace-period=30
    done
    
    # Wait for pods to be recreated
    sleep 30
    
    # Check if pods are now healthy
    local running_pods
    running_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Running --no-headers | wc -l)
    
    if [[ $running_pods -gt 0 ]]; then
        success "$running_pods pods are now running"
        return 0
    else
        error "No pods are running after restart attempt"
        return 1
    fi
}

reset_circuit_breakers() {
    log "🔌 Checking and resetting circuit breakers..."
    
    # Get circuit breaker status
    local circuit_breaker_data
    if ! circuit_breaker_data=$(curl -sf --max-time 10 "${HEALTH_ENDPOINT%/health}/api/resilience/circuit-breakers" 2>/dev/null); then
        warn "Cannot access circuit breaker API"
        return 1
    fi
    
    # Find open circuit breakers
    local open_circuits
    open_circuits=$(echo "$circuit_breaker_data" | jq -r '.circuitBreakers | to_entries[] | select(.value.state == "OPEN") | .key' 2>/dev/null)
    
    if [[ -z "$open_circuits" ]]; then
        log "No open circuit breakers found"
        return 0
    fi
    
    log "Found open circuit breakers: $(echo "$open_circuits" | tr '\n' ' ')"
    
    # Reset each open circuit breaker
    local reset_success=true
    while IFS= read -r circuit_name; do
        [[ -n "$circuit_name" ]] || continue
        
        log "Resetting circuit breaker: $circuit_name"
        if curl -sf --max-time 10 -X POST "${HEALTH_ENDPOINT%/health}/api/resilience/circuit-breakers/$circuit_name/reset" >/dev/null 2>&1; then
            success "Circuit breaker $circuit_name reset"
        else
            error "Failed to reset circuit breaker $circuit_name"
            reset_success=false
        fi
    done <<< "$open_circuits"
    
    return $([[ "$reset_success" == "true" ]] && echo 0 || echo 1)
}

validate_database_connections() {
    log "🗄️ Validating database connections..."
    
    # Check resilience health endpoint for database status
    local resilience_health
    if ! resilience_health=$(curl -sf --max-time 10 "${HEALTH_ENDPOINT%/health}/api/resilience/health" 2>/dev/null); then
        error "Cannot access resilience health API"
        return 1
    fi
    
    # Check individual database health
    local db_healthy=true
    
    # PostgreSQL
    if echo "$resilience_health" | jq -e '.components.resilience.postgres.healthy' >/dev/null 2>&1; then
        if [[ $(echo "$resilience_health" | jq -r '.components.resilience.postgres.healthy') == "true" ]]; then
            success "PostgreSQL connection healthy"
        else
            error "PostgreSQL connection unhealthy"
            db_healthy=false
        fi
    else
        warn "Cannot determine PostgreSQL health status"
        db_healthy=false
    fi
    
    # Neo4j
    if echo "$resilience_health" | jq -e '.components.resilience.neo4j.healthy' >/dev/null 2>&1; then
        if [[ $(echo "$resilience_health" | jq -r '.components.resilience.neo4j.healthy') == "true" ]]; then
            success "Neo4j connection healthy"
        else
            error "Neo4j connection unhealthy"
            db_healthy=false
        fi
    else
        warn "Cannot determine Neo4j health status"
        db_healthy=false
    fi
    
    # Redis
    if echo "$resilience_health" | jq -e '.components.resilience.redis.healthy' >/dev/null 2>&1; then
        if [[ $(echo "$resilience_health" | jq -r '.components.resilience.redis.healthy') == "true" ]]; then
            success "Redis connection healthy"
        else
            error "Redis connection unhealthy"
            db_healthy=false
        fi
    else
        warn "Cannot determine Redis health status"
        db_healthy=false
    fi
    
    return $([[ "$db_healthy" == "true" ]] && echo 0 || echo 1)
}

scale_services_if_needed() {
    log "📈 Checking if services need scaling..."
    
    # Check current replica counts and resource usage
    local services_scaled=false
    
    # Check Maestro control plane
    local current_replicas
    current_replicas=$(kubectl get deployment maestro-control-plane -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    local ready_replicas
    ready_replicas=$(kubectl get deployment maestro-control-plane -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    
    if [[ $ready_replicas -lt $current_replicas ]]; then
        warn "Not all replicas are ready ($ready_replicas/$current_replicas)"
        
        # Check if we should scale up temporarily
        if [[ $current_replicas -lt 5 ]]; then
            log "Scaling up control plane to handle load"
            kubectl scale deployment maestro-control-plane --replicas=$((current_replicas + 1)) -n "$NAMESPACE"
            services_scaled=true
            sleep 30
        fi
    fi
    
    # Check HPA status
    local hpa_status
    if hpa_status=$(kubectl get hpa -n "$NAMESPACE" --no-headers 2>/dev/null); then
        log "HPA status: $hpa_status"
    else
        warn "No HPA configured"
    fi
    
    if [[ "$services_scaled" == "true" ]]; then
        success "Services scaled for recovery"
        return 0
    else
        log "No scaling needed"
        return 0
    fi
}

monitor_recovery() {
    log "📊 Starting post-recovery monitoring..."
    
    local monitoring_duration=3600  # 1 hour
    local check_interval=60         # 1 minute
    local checks_performed=0
    local failed_checks=0
    local max_allowed_failures=5
    
    local monitoring_start=$(date +%s)
    
    while [[ $(($(date +%s) - monitoring_start)) -lt $monitoring_duration ]]; do
        ((checks_performed++))
        
        if check_system_health; then
            if [[ $SYSTEM_HEALTH_SCORE -ge 80 ]]; then
                success "Monitoring check $checks_performed: System healthy ($SYSTEM_HEALTH_SCORE/100)"
            else
                warn "Monitoring check $checks_performed: System degraded ($SYSTEM_HEALTH_SCORE/100)"
                ((failed_checks++))
            fi
        else
            error "Monitoring check $checks_performed: Health check failed"
            ((failed_checks++))
        fi
        
        # Check if too many failures
        if [[ $failed_checks -gt $max_allowed_failures ]]; then
            critical "Too many monitoring failures ($failed_checks/$max_allowed_failures)"
            send_alert "Post-recovery monitoring detected system instability. $failed_checks failed checks out of $checks_performed." "high" "incidents"
            return 1
        fi
        
        sleep $check_interval
    done
    
    local success_rate=$((((checks_performed - failed_checks) * 100) / checks_performed))
    
    success "🎉 Post-recovery monitoring completed"
    log "   Duration: $((monitoring_duration / 60)) minutes"
    log "   Checks performed: $checks_performed"
    log "   Failed checks: $failed_checks"
    log "   Success rate: $success_rate%"
    
    if [[ $success_rate -ge 90 ]]; then
        send_alert "Post-recovery monitoring successful. Success rate: $success_rate%" "low" "incidents"
        return 0
    else
        send_alert "Post-recovery monitoring shows instability. Success rate: $success_rate%" "medium" "incidents"
        return 1
    fi
}

run_dr_test() {
    log "🧪 Running disaster recovery test..."
    
    warn "This is a TEST MODE - no actual recovery actions will be performed"
    
    # Simulate various scenarios
    log "Simulating incident detection..."
    INCIDENT_ID=$(generate_incident_id)
    INCIDENT_SEVERITY="medium"
    
    log "Simulating health checks..."
    # Force a degraded state for testing
    export SYSTEM_HEALTH_SCORE=65
    export SYSTEM_STATUS="DEGRADED"
    
    log "Testing alert mechanisms..."
    send_alert "This is a disaster recovery test - please ignore" "low" "dr-testing"
    
    log "Simulating recovery procedures..."
    log "  [SIMULATION] Would restart unhealthy pods"
    log "  [SIMULATION] Would reset circuit breakers"
    log "  [SIMULATION] Would validate database connections"
    log "  [SIMULATION] Would scale services if needed"
    
    success "🎉 Disaster recovery test completed successfully"
    
    echo ""
    echo "Test Summary:"
    echo "============"
    echo "Incident ID: $INCIDENT_ID"
    echo "Simulated Health Score: $SYSTEM_HEALTH_SCORE/100"
    echo "Simulated Status: $SYSTEM_STATUS"
    echo "Alert mechanisms: Tested"
    echo "Recovery procedures: Simulated"
    echo ""
    echo "Next steps:"
    echo "1. Review test results"
    echo "2. Update recovery procedures if needed"
    echo "3. Schedule regular DR tests"
    echo "4. Train team on manual recovery procedures"
}

cleanup() {
    log "🧹 Cleaning up DR automation resources..."
    
    # Clean up any temporary files
    rm -f /tmp/dr-*.tmp
    rm -f /tmp/health-check-*.json
    
    # Log session summary
    local session_duration=$(($(date +%s) - START_TIME))
    log "DR automation session completed in ${session_duration} seconds"
    
    if [[ -n "$INCIDENT_ID" ]]; then
        log "Incident ID: $INCIDENT_ID"
    fi
}

# Set up signal handlers
trap cleanup EXIT
trap 'critical "DR automation interrupted"; cleanup; exit 1' INT TERM

main() {
    echo "🚨 Maestro Conductor Disaster Recovery Automation"
    echo "================================================="
    echo "Mode: $DR_MODE"
    echo "Namespace: $NAMESPACE"
    echo "Health Endpoint: $HEALTH_ENDPOINT"
    [[ -n "$INCIDENT_ID" ]] && echo "Incident ID: $INCIDENT_ID"
    echo "Max Recovery Attempts: $MAX_RECOVERY_ATTEMPTS"
    echo "Recovery Timeout: $RECOVERY_TIMEOUT seconds"
    echo ""
    
    # Check prerequisites
    if ! command -v kubectl >/dev/null 2>&1; then
        error "kubectl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        error "jq is required but not installed"
        exit 1
    fi
    
    # Execute based on mode
    case $DR_MODE in
        detection)
            log "Starting incident detection mode..."
            detect_incidents
            ;;
        recovery)
            if [[ -z "$INCIDENT_ID" ]]; then
                INCIDENT_ID=$(generate_incident_id)
                log "Generated incident ID: $INCIDENT_ID"
            fi
            log "Starting recovery mode for incident: $INCIDENT_ID"
            execute_recovery_procedures
            ;;
        monitoring)
            log "Starting post-recovery monitoring mode..."
            monitor_recovery
            ;;
        test)
            log "Starting disaster recovery test mode..."
            run_dr_test
            ;;
        *)
            error "Unknown DR mode: $DR_MODE"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"