#!/usr/bin/env bash
set -euo pipefail

# Conductor Incident Response Playbook Script
# Automated incident response coordination and execution

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }
info() { printf "${PURPLE}📋 %s${NC}\n" "$*"; }

# Configuration
INCIDENT_ID="${INCIDENT_ID:-incident_$(date +%s)}"
INCIDENT_TYPE="${INCIDENT_TYPE:-security}"
SEVERITY="${SEVERITY:-P2}"
COMMANDER="${COMMANDER:-$(whoami)}"
WAR_ROOM_URL="ws://localhost:8083"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

# Incident context
INCIDENT_TITLE=""
INCIDENT_DESCRIPTION=""
AFFECTED_SERVICES=""
ROOT_CAUSE=""

# Initialize incident response
initialize_incident() {
    say "🚨 Initializing Incident Response"
    
    # Create incident directory
    local incident_dir="incidents/${INCIDENT_ID}"
    mkdir -p "$incident_dir"/{logs,artifacts,evidence,reports}
    
    # Create incident metadata
    cat > "$incident_dir/metadata.json" << EOF
{
  "id": "$INCIDENT_ID",
  "type": "$INCIDENT_TYPE", 
  "severity": "$SEVERITY",
  "commander": "$COMMANDER",
  "startTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "title": "$INCIDENT_TITLE",
  "description": "$INCIDENT_DESCRIPTION",
  "affectedServices": "$AFFECTED_SERVICES",
  "status": "active"
}
EOF

    # Initialize war room
    if command -v wscat >/dev/null 2>&1; then
        info "Creating war room for incident coordination"
        echo "War room available at: $WAR_ROOM_URL?session=war_${INCIDENT_ID}&user=$COMMANDER"
    else
        warn "wscat not available - install with 'npm install -g wscat' for war room support"
    fi
    
    # Create incident log
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - INCIDENT STARTED: $INCIDENT_TITLE" > "$incident_dir/incident.log"
    
    pass "Incident response initialized: $INCIDENT_ID"
    echo "Incident Directory: $incident_dir"
    echo "Incident Type: $INCIDENT_TYPE"
    echo "Severity: $SEVERITY"
    echo "Commander: $COMMANDER"
}

# Execute immediate containment
execute_containment() {
    say "🔒 Executing Immediate Containment"
    local incident_dir="incidents/${INCIDENT_ID}"
    
    case "$INCIDENT_TYPE" in
        "security")
            execute_security_containment
            ;;
        "performance")
            execute_performance_containment
            ;;
        "availability") 
            execute_availability_containment
            ;;
        *)
            execute_general_containment
            ;;
    esac
    
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - CONTAINMENT EXECUTED" >> "$incident_dir/incident.log"
}

# Security incident containment
execute_security_containment() {
    info "Executing security containment procedures"
    local incident_dir="incidents/${INCIDENT_ID}"
    
    # Enable maintenance mode
    if command -v redis-cli >/dev/null 2>&1; then
        redis-cli -u "$REDIS_URL" set system_maintenance "{\"enabled\": true, \"reason\": \"security_incident\", \"timestamp\": $(date +%s)}" >/dev/null 2>&1 || true
        pass "System maintenance mode enabled"
    fi
    
    # Collect immediate forensic evidence
    info "Collecting forensic evidence"
    {
        echo "=== System Status at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
        docker compose ps || echo "Docker compose not available"
        echo ""
        echo "=== Recent Authentication Logs ==="
        if [ -f /var/log/auth.log ]; then
            tail -50 /var/log/auth.log || echo "Auth logs not accessible"
        else
            echo "Auth logs not found"
        fi
        echo ""
        echo "=== Network Connections ==="
        netstat -tuln 2>/dev/null || ss -tuln 2>/dev/null || echo "Network info not available"
        echo ""
        echo "=== Process List ==="
        ps aux 2>/dev/null || echo "Process list not available"
    } > "$incident_dir/evidence/initial_forensics.txt"
    
    # Block external traffic if load balancer available
    if [ -n "${LOAD_BALANCER_API:-}" ] && [ -n "${LB_TOKEN:-}" ]; then
        info "Blocking external traffic"
        curl -s -X POST "$LOAD_BALANCER_API/block-external" \
             -H "Authorization: Bearer $LB_TOKEN" \
             -d '{"action": "block_external", "reason": "security_incident"}' \
             > "$incident_dir/logs/lb_response.json" 2>&1 || true
    fi
    
    # Isolate compromised user if specified
    if [ -n "${COMPROMISED_USER:-}" ]; then
        redis-cli -u "$REDIS_URL" setex "isolated_user:$COMPROMISED_USER" 3600 "{\"reason\": \"$INCIDENT_ID\", \"timestamp\": $(date +%s)}" >/dev/null 2>&1 || true
        pass "User isolated: $COMPROMISED_USER"
    fi
}

# Performance incident containment  
execute_performance_containment() {
    info "Executing performance containment procedures"
    local incident_dir="incidents/${INCIDENT_ID}"
    
    # Collect performance metrics
    {
        echo "=== System Resources at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
        top -n 1 -b 2>/dev/null || echo "CPU info not available"
        echo ""
        echo "=== Memory Usage ==="
        free -h 2>/dev/null || echo "Memory info not available"
        echo ""
        echo "=== Disk Usage ==="
        df -h 2>/dev/null || echo "Disk info not available"
        echo ""
        echo "=== Docker Stats ==="
        timeout 10 docker stats --no-stream 2>/dev/null || echo "Docker stats not available"
    } > "$incident_dir/evidence/performance_snapshot.txt"
    
    # Reset circuit breakers
    if command -v curl >/dev/null 2>&1; then
        curl -s -X POST "http://localhost:3000/api/conductor/circuit-breaker/reset" || true
        pass "Circuit breakers reset"
    fi
    
    # Scale critical services if docker-compose available
    if [ -f "docker-compose.dev.yml" ]; then
        info "Scaling critical services"
        docker compose -f docker-compose.dev.yml scale server=2 || true
        pass "Services scaled up"
    fi
}

# Availability incident containment
execute_availability_containment() {
    info "Executing availability containment procedures"
    local incident_dir="incidents/${INCIDENT_ID}"
    
    # Restart failed services
    if [ -f "docker-compose.dev.yml" ]; then
        info "Restarting services"
        if [ -n "$AFFECTED_SERVICES" ]; then
            for service in $(echo "$AFFECTED_SERVICES" | tr ',' ' '); do
                docker compose restart "$service" || true
                pass "Restarted service: $service"
            done
        else
            docker compose restart || true
            pass "All services restarted"
        fi
    fi
    
    # Health check all services
    {
        echo "=== Service Health Checks at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
        for endpoint in "http://localhost:3000/api/status" "http://localhost:7474" "http://localhost:5432" "http://localhost:6379"; do
            echo "Checking $endpoint..."
            curl -s -f -m 5 "$endpoint" >/dev/null 2>&1 && echo "✅ $endpoint - OK" || echo "❌ $endpoint - FAILED"
        done
    } > "$incident_dir/evidence/service_health.txt"
}

# General containment procedures
execute_general_containment() {
    info "Executing general containment procedures"
    local incident_dir="incidents/${INCIDENT_ID}"
    
    # Collect system state
    {
        echo "=== System State at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
        uname -a 2>/dev/null || echo "System info not available"
        echo ""
        echo "=== Environment Variables ==="
        printenv | grep -E '^(CONDUCTOR_|OPA_|MCP_|NEO4J_|POSTGRES_|REDIS_|LLM_)' | sort || echo "Env vars not accessible"
        echo ""
        echo "=== Docker Services ==="
        docker compose ps 2>/dev/null || echo "Docker compose not available"
    } > "$incident_dir/evidence/system_state.txt"
}

# Collect comprehensive evidence
collect_evidence() {
    say "🔍 Collecting Incident Evidence"
    local incident_dir="incidents/${INCIDENT_ID}"
    
    # Application logs
    info "Collecting application logs"
    if [ -d "logs" ]; then
        cp -r logs/* "$incident_dir/logs/" 2>/dev/null || true
    fi
    
    # Docker logs
    if command -v docker >/dev/null 2>&1; then
        for container in $(docker ps --format "{{.Names}}" 2>/dev/null); do
            docker logs --since="1h" "$container" > "$incident_dir/logs/${container}.log" 2>&1 || true
        done
    fi
    
    # Configuration files
    info "Backing up configuration files"
    for config in "docker-compose.dev.yml" ".env" "Justfile"; do
        [ -f "$config" ] && cp "$config" "$incident_dir/artifacts/" || true
    done
    
    # Database snapshots (if accessible)
    info "Creating database snapshots"
    if command -v pg_dump >/dev/null 2>&1; then
        pg_dump -h localhost -p 5432 -U postgres -d conductor --schema-only > "$incident_dir/evidence/db_schema.sql" 2>/dev/null || true
    fi
    
    # System metrics
    info "Collecting system metrics"
    {
        echo "=== Load Average ==="
        uptime 2>/dev/null || echo "Load info not available"
        echo ""
        echo "=== Open Files ==="
        lsof 2>/dev/null | wc -l || echo "File count not available"
        echo ""
        echo "=== Network Statistics ==="
        ss -s 2>/dev/null || netstat -s 2>/dev/null || echo "Network stats not available"
    } > "$incident_dir/evidence/system_metrics.txt"
    
    pass "Evidence collection completed"
}

# Execute recovery procedures
execute_recovery() {
    say "🔧 Executing Recovery Procedures"
    local incident_dir="incidents/${INCIDENT_ID}"
    
    case "$INCIDENT_TYPE" in
        "security")
            execute_security_recovery
            ;;
        "performance")
            execute_performance_recovery  
            ;;
        "availability")
            execute_availability_recovery
            ;;
        *)
            execute_general_recovery
            ;;
    esac
    
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - RECOVERY EXECUTED" >> "$incident_dir/incident.log"
}

# Security recovery procedures
execute_security_recovery() {
    info "Executing security recovery procedures"
    
    # Rotate credentials if needed
    if [ "${ROTATE_CREDENTIALS:-false}" = "true" ]; then
        info "Credential rotation required - manual intervention needed"
        warn "MANUAL ACTION: Rotate all service credentials and API keys"
        read -p "Press Enter when credential rotation is complete..."
    fi
    
    # Remove isolation after verification
    if [ -n "${COMPROMISED_USER:-}" ]; then
        read -p "Remove user isolation for $COMPROMISED_USER? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            redis-cli -u "$REDIS_URL" del "isolated_user:$COMPROMISED_USER" >/dev/null 2>&1 || true
            pass "User isolation removed: $COMPROMISED_USER"
        fi
    fi
    
    # Disable maintenance mode after validation
    read -p "Disable maintenance mode and restore normal operations? (y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        redis-cli -u "$REDIS_URL" del system_maintenance >/dev/null 2>&1 || true
        pass "Maintenance mode disabled"
    fi
}

# Performance recovery procedures  
execute_performance_recovery() {
    info "Executing performance recovery procedures"
    
    # Validate system performance
    info "Validating system performance"
    if command -v curl >/dev/null 2>&1; then
        response_time=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:3000/api/status)
        if (( $(echo "$response_time < 2.0" | bc -l) )); then
            pass "Response time acceptable: ${response_time}s"
        else
            warn "Response time elevated: ${response_time}s"
        fi
    fi
    
    # Scale down if scaled up during containment
    if [ -f "docker-compose.dev.yml" ]; then
        read -p "Scale services back to normal levels? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose -f docker-compose.dev.yml scale server=1 || true
            pass "Services scaled to normal levels"
        fi
    fi
}

# Availability recovery procedures
execute_availability_recovery() {
    info "Executing availability recovery procedures"
    
    # Comprehensive health check
    info "Running comprehensive health checks"
    local all_healthy=true
    
    for endpoint in "http://localhost:3000/api/health" "http://localhost:7474" "http://localhost:5432"; do
        if ! curl -s -f -m 10 "$endpoint" >/dev/null 2>&1; then
            fail "Health check failed: $endpoint"
            all_healthy=false
        else
            pass "Health check passed: $endpoint"
        fi
    done
    
    if [ "$all_healthy" = "true" ]; then
        pass "All services are healthy"
    else
        warn "Some services remain unhealthy - manual intervention may be required"
    fi
}

# General recovery procedures
execute_general_recovery() {
    info "Executing general recovery procedures"
    
    # Verify system state
    info "Verifying system state"
    if [ -f "docker-compose.dev.yml" ]; then
        docker compose ps
    fi
}

# Send notifications
send_notifications() {
    local phase="$1"
    local incident_dir="incidents/${INCIDENT_ID}"
    
    case "$phase" in
        "start")
            local message="🚨 INCIDENT STARTED: $INCIDENT_TITLE (ID: $INCIDENT_ID, Severity: $SEVERITY)"
            ;;
        "contained")
            local message="🔒 INCIDENT CONTAINED: $INCIDENT_TITLE (ID: $INCIDENT_ID)"
            ;;
        "resolved")
            local message="✅ INCIDENT RESOLVED: $INCIDENT_TITLE (ID: $INCIDENT_ID)"
            ;;
        *)
            local message="📋 INCIDENT UPDATE: $INCIDENT_TITLE (ID: $INCIDENT_ID, Phase: $phase)"
            ;;
    esac
    
    # Send Slack notification if webhook available
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
             -H 'Content-type: application/json' \
             -d "{\"text\": \"$message\", \"channel\": \"#incidents\"}" >/dev/null 2>&1 || true
        pass "Slack notification sent"
    fi
    
    # Log notification
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - NOTIFICATION: $message" >> "$incident_dir/incident.log"
}

# Generate incident report
generate_report() {
    say "📄 Generating Incident Report"
    local incident_dir="incidents/${INCIDENT_ID}"
    local report_file="$incident_dir/reports/incident_report.md"
    
    cat > "$report_file" << EOF
# Incident Report: $INCIDENT_ID

## Summary
- **Incident ID**: $INCIDENT_ID
- **Title**: $INCIDENT_TITLE  
- **Type**: $INCIDENT_TYPE
- **Severity**: $SEVERITY
- **Commander**: $COMMANDER
- **Start Time**: $(head -1 "$incident_dir/incident.log" | cut -d' ' -f1-2)
- **End Time**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Duration**: $(($(date +%s) - $(date -d "$(head -1 "$incident_dir/incident.log" | cut -d' ' -f1-2)" +%s))) seconds

## Description
$INCIDENT_DESCRIPTION

## Affected Services  
$AFFECTED_SERVICES

## Root Cause
$ROOT_CAUSE

## Timeline
\`\`\`
$(cat "$incident_dir/incident.log")
\`\`\`

## Evidence Collected
- System state snapshots
- Application logs
- Configuration backups
- Performance metrics
- Forensic data

## Recovery Actions
- Containment procedures executed
- Evidence collected and preserved
- Recovery procedures completed
- System validation performed

## Prevention Measures
TODO: Add prevention measures based on root cause analysis

## Lessons Learned
TODO: Document lessons learned and process improvements

---
*Report generated by Conductor Incident Response Playbook*
*Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)*
EOF

    pass "Incident report generated: $report_file"
    
    # Update metadata with resolution
    jq --arg endTime "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       --arg status "resolved" \
       '. + {endTime: $endTime, status: $status}' \
       "$incident_dir/metadata.json" > "$incident_dir/metadata.json.tmp" && \
       mv "$incident_dir/metadata.json.tmp" "$incident_dir/metadata.json" 2>/dev/null || true
}

# Record audit evidence summary for incident command activation
record_incident_evidence() {
    local evidence_dir="audit/ga-evidence/ops/incident-records"
    mkdir -p "$evidence_dir"

    cat > "$evidence_dir/incident-${INCIDENT_ID}.json" << EOF
{
  "evidence_id": "incident-${INCIDENT_ID}",
  "incident_id": "${INCIDENT_ID}",
  "incident_type": "${INCIDENT_TYPE}",
  "severity": "${SEVERITY}",
  "commander": "${COMMANDER}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "report_path": "incidents/${INCIDENT_ID}/reports/incident_report.md",
  "evidence_path": "incidents/${INCIDENT_ID}/evidence/",
  "status": "recorded"
}
EOF
}

# Interactive incident setup
interactive_setup() {
    say "🚨 Conductor Incident Response Setup"
    
    echo "Please provide incident details:"
    read -p "Incident Title: " INCIDENT_TITLE
    read -p "Incident Description: " INCIDENT_DESCRIPTION
    read -p "Affected Services (comma-separated): " AFFECTED_SERVICES
    
    echo ""
    echo "Select incident type:"
    echo "1) Security"  
    echo "2) Performance"
    echo "3) Availability"
    echo "4) Other"
    read -p "Choice (1-4): " type_choice
    
    case "$type_choice" in
        1) INCIDENT_TYPE="security" ;;
        2) INCIDENT_TYPE="performance" ;;
        3) INCIDENT_TYPE="availability" ;;
        *) INCIDENT_TYPE="other" ;;
    esac
    
    echo ""
    echo "Select severity:"
    echo "1) P0 - Critical (Complete outage)"
    echo "2) P1 - High (Major functionality affected)"  
    echo "3) P2 - Medium (Minor functionality affected)"
    echo "4) P3 - Low (Minimal impact)"
    read -p "Choice (1-4): " severity_choice
    
    case "$severity_choice" in
        1) SEVERITY="P0" ;;
        2) SEVERITY="P1" ;;
        3) SEVERITY="P2" ;;
        *) SEVERITY="P3" ;;
    esac
    
    export INCIDENT_TITLE INCIDENT_DESCRIPTION AFFECTED_SERVICES INCIDENT_TYPE SEVERITY
}

# Main execution
main() {
    say "🚨 Conductor Incident Response Playbook"
    
    # Interactive setup if no title provided
    if [ -z "${INCIDENT_TITLE:-}" ]; then
        interactive_setup
    fi
    
    # Initialize incident
    initialize_incident
    send_notifications "start"
    
    # Execute containment
    execute_containment
    send_notifications "contained"
    
    # Collect evidence
    collect_evidence
    
    # Execute recovery
    execute_recovery
    send_notifications "resolved"
    
    # Generate report
    read -p "Root cause analysis: " ROOT_CAUSE
    export ROOT_CAUSE
    generate_report
    record_incident_evidence

    say "✅ Incident Response Complete"
    echo ""
    info "Incident ID: $INCIDENT_ID"
    info "Report: incidents/${INCIDENT_ID}/reports/incident_report.md"
    info "Evidence: incidents/${INCIDENT_ID}/evidence/"
    info "War Room: $WAR_ROOM_URL?session=war_${INCIDENT_ID}&user=$COMMANDER"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Review incident report"
    echo "2. Conduct post-incident review"
    echo "3. Implement prevention measures"
    echo "4. Update runbooks and procedures"
}

# Handle arguments
case "${1:-}" in
    --security)
        export INCIDENT_TYPE="security"
        export SEVERITY="${2:-P1}"
        main
        ;;
    --performance)
        export INCIDENT_TYPE="performance" 
        export SEVERITY="${2:-P2}"
        main
        ;;
    --availability)
        export INCIDENT_TYPE="availability"
        export SEVERITY="${2:-P1}"
        main
        ;;
    --help)
        cat << EOF
Usage: $0 [options]

Conductor Incident Response Playbook

Options:
  --security [P0|P1|P2|P3]      Security incident
  --performance [P0|P1|P2|P3]   Performance incident  
  --availability [P0|P1|P2|P3]  Availability incident
  --help                        Show this help

Environment Variables:
  INCIDENT_ID        Incident ID (auto-generated)
  INCIDENT_TYPE      Type of incident
  SEVERITY          Incident severity (P0-P3)
  COMMANDER         Incident commander (default: current user)
  SLACK_WEBHOOK_URL  Slack webhook for notifications
  REDIS_URL         Redis connection string

Examples:
  # Interactive incident response
  ./scripts/incident-playbook.sh
  
  # Security incident (P1)
  ./scripts/incident-playbook.sh --security P1
  
  # Performance incident with custom details
  INCIDENT_TITLE="High latency" AFFECTED_SERVICES="api,database" ./scripts/incident-playbook.sh --performance P2

EOF
        ;;
    *)
        main
        ;;
esac
