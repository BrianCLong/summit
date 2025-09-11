#!/bin/bash

# Maestro Conductor v24.3.0 - Failover Script
# Epic E14: DR & Failover - Automated failover procedures
# Target RTO: ≤ 30 minutes, RPO: ≤ 5 minutes

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KUBECTL="${KUBECTL:-kubectl}"
HELM="${HELM:-helm}"

# Default values
PRIMARY_REGION=""
FAILOVER_REGION=""
NAMESPACE="maestro"
DRY_RUN=false
FORCE=false
VERBOSE=false
ROLLBACK=false

# State file for tracking failover
STATE_FILE="/tmp/maestro_failover_state"

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Orchestrate Maestro failover between regions

OPTIONS:
    -p, --primary REGION         Current primary region
    -f, --failover REGION        Target failover region
    -n, --namespace NAMESPACE    Kubernetes namespace (default: ${NAMESPACE})
    --rollback                   Rollback previous failover
    --dry-run                    Show what would be done without executing
    --force                      Skip confirmation prompts
    -v, --verbose                Enable verbose output
    -h, --help                   Show this help message

EXAMPLES:
    # Failover from us-east-1 to us-west-2
    $0 --primary us-east-1 --failover us-west-2

    # Dry run to see what would happen
    $0 --primary us-east-1 --failover us-west-2 --dry-run

    # Rollback previous failover
    $0 --rollback

FAILOVER PROCESS:
    1. Health check of target region
    2. Stop write traffic to primary region
    3. Perform final backup of primary region
    4. Promote read replica to primary in target region
    5. Update DNS/load balancer routing
    6. Start services in target region
    7. Verify failover success
EOF
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

verbose_log() {
    if [ "${VERBOSE}" = true ]; then
        log "VERBOSE: $*"
    fi
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

confirm() {
    if [ "${FORCE}" = true ]; then
        return 0
    fi
    
    local message="$1"
    echo -n "${message} (y/N): "
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            echo "Aborted."
            exit 1
            ;;
    esac
}

save_state() {
    local state="$1"
    local data="$2"
    
    cat > "${STATE_FILE}" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "state": "${state}",
    "primary_region": "${PRIMARY_REGION}",
    "failover_region": "${FAILOVER_REGION}",
    "data": ${data}
}
EOF
    verbose_log "State saved: ${state}"
}

load_state() {
    if [ ! -f "${STATE_FILE}" ]; then
        return 1
    fi
    
    jq -r '.state' "${STATE_FILE}" 2>/dev/null || echo "unknown"
}

check_prerequisites() {
    verbose_log "Checking prerequisites..."
    
    # Check required tools
    command -v kubectl >/dev/null 2>&1 || error "kubectl not found"
    command -v helm >/dev/null 2>&1 || error "helm not found"
    command -v jq >/dev/null 2>&1 || error "jq not found"
    command -v aws >/dev/null 2>&1 || error "AWS CLI not found"
    
    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || error "AWS credentials not configured"
    
    verbose_log "Prerequisites check passed"
}

check_region_health() {
    local region="$1"
    local context="maestro-${region}"
    
    log "Checking health of region: ${region}"
    
    # Check if kubectl context exists and is accessible
    if ! kubectl config get-contexts "${context}" >/dev/null 2>&1; then
        error "Kubernetes context not found: ${context}"
    fi
    
    # Switch to target region context
    kubectl config use-context "${context}" >/dev/null 2>&1 || error "Failed to switch to context: ${context}"
    
    # Check cluster health
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Cluster is not accessible in region: ${region}"
    fi
    
    # Check if Maestro is deployed
    if ! helm list -n "${NAMESPACE}" | grep -q maestro; then
        error "Maestro is not deployed in region: ${region}"
    fi
    
    # Check database readiness
    local pg_ready=$(kubectl get pods -n "${NAMESPACE}" -l app=maestro-pg -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -c "True" || echo "0")
    local neo4j_ready=$(kubectl get pods -n "${NAMESPACE}" -l app=maestro-neo4j -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -c "True" || echo "0")
    
    if [ "${pg_ready}" -eq 0 ] || [ "${neo4j_ready}" -eq 0 ]; then
        error "Databases are not ready in region: ${region} (PG: ${pg_ready}, Neo4j: ${neo4j_ready})"
    fi
    
    log "Region ${region} is healthy and ready"
}

stop_write_traffic() {
    local region="$1"
    local context="maestro-${region}"
    
    log "Stopping write traffic in region: ${region}"
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would stop write traffic in ${region}"
        return
    fi
    
    kubectl config use-context "${context}"
    
    # Scale down write-enabled services
    kubectl scale deployment maestro-server -n "${NAMESPACE}" --replicas=0
    kubectl scale deployment maestro-gateway -n "${NAMESPACE}" --replicas=0
    
    # Wait for pods to terminate
    kubectl wait --for=delete pod -l app=maestro-server -n "${NAMESPACE}" --timeout=300s || true
    kubectl wait --for=delete pod -l app=maestro-gateway -n "${NAMESPACE}" --timeout=300s || true
    
    # Update ingress to return maintenance page
    kubectl patch ingress maestro-ingress -n "${NAMESPACE}" \
        --type='json' \
        -p='[{"op": "add", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1server-snippet", "value": "return 503 \"Maintenance in progress\";"}]' || true
    
    log "Write traffic stopped in region: ${region}"
}

perform_final_backup() {
    local region="$1"
    
    log "Performing final backup before failover from region: ${region}"
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would perform final backup from ${region}"
        return
    fi
    
    # Trigger immediate backup jobs
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    # PostgreSQL backup
    kubectl create job -n "${NAMESPACE}" \
        "maestro-pg-final-backup-${timestamp}" \
        --from=cronjob/maestro-pg-backup || error "Failed to create PG backup job"
    
    # Neo4j backup
    kubectl create job -n "${NAMESPACE}" \
        "maestro-neo4j-final-backup-${timestamp}" \
        --from=cronjob/maestro-neo4j-backup || error "Failed to create Neo4j backup job"
    
    # Wait for backups to complete
    log "Waiting for final backups to complete..."
    kubectl wait --for=condition=complete job -n "${NAMESPACE}" \
        "maestro-pg-final-backup-${timestamp}" --timeout=600s || error "PG final backup failed"
    kubectl wait --for=condition=complete job -n "${NAMESPACE}" \
        "maestro-neo4j-final-backup-${timestamp}" --timeout=600s || error "Neo4j final backup failed"
    
    log "Final backups completed successfully"
}

promote_read_replica() {
    local region="$1"
    local context="maestro-${region}"
    
    log "Promoting read replica to primary in region: ${region}"
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would promote read replica in ${region}"
        return
    fi
    
    kubectl config use-context "${context}"
    
    # Promote PostgreSQL replica
    log "Promoting PostgreSQL replica..."
    kubectl exec -n "${NAMESPACE}" deployment/maestro-pg-replica -c postgres -- \
        su - postgres -c "pg_promote" || error "Failed to promote PostgreSQL replica"
    
    # Update PostgreSQL configuration for writes
    kubectl patch configmap maestro-pg-config -n "${NAMESPACE}" \
        --type='json' \
        -p='[{"op": "replace", "path": "/data/postgresql.conf", "value": "# Primary configuration\nwal_level = replica\nmax_wal_senders = 3\nwal_keep_size = 1GB\narchive_mode = on\narchive_command = 'cp %p /var/lib/postgresql/archive/%f'"}]'
    
    # Restart PostgreSQL with new configuration
    kubectl rollout restart deployment/maestro-pg -n "${NAMESPACE}"
    kubectl rollout status deployment/maestro-pg -n "${NAMESPACE}" --timeout=300s || error "PostgreSQL promotion failed"
    
    # Update Neo4j to accept writes
    log "Enabling writes on Neo4j replica..."
    kubectl exec -n "${NAMESPACE}" deployment/maestro-neo4j -c neo4j -- \
        cypher-shell -u neo4j -p password \
        "CALL dbms.cluster.role() YIELD role RETURN role;" || true
    
    # If Neo4j is in a cluster, promote it
    kubectl exec -n "${NAMESPACE}" deployment/maestro-neo4j -c neo4j -- \
        cypher-shell -u neo4j -p password \
        "CALL dbms.cluster.setRoutingTableTTL(1);" || true
    
    log "Database replicas promoted successfully"
}

update_routing() {
    local from_region="$1"
    local to_region="$2"
    
    log "Updating routing from ${from_region} to ${to_region}"
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would update routing from ${from_region} to ${to_region}"
        return
    fi
    
    # Update Route53 records to point to new region
    local hosted_zone_id=$(aws route53 list-hosted-zones --query 'HostedZones[?Name==`topicality.co.`].Id' --output text | cut -d'/' -f3)
    
    if [ -n "${hosted_zone_id}" ]; then
        # Get current record
        local current_record=$(aws route53 list-resource-record-sets \
            --hosted-zone-id "${hosted_zone_id}" \
            --query "ResourceRecordSets[?Name==\`maestro.topicality.co.\`]" \
            --output json)
        
        # Update to point to new region
        local new_elb=$(kubectl get service maestro-gateway-lb -n "${NAMESPACE}" \
            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || echo "")
        
        if [ -n "${new_elb}" ]; then
            cat > "/tmp/route53_change.json" << EOF
{
    "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": "maestro.topicality.co.",
            "Type": "CNAME",
            "TTL": 60,
            "ResourceRecords": [{"Value": "${new_elb}"}]
        }
    }]
}
EOF
            
            aws route53 change-resource-record-sets \
                --hosted-zone-id "${hosted_zone_id}" \
                --change-batch file:///tmp/route53_change.json || error "Failed to update DNS"
            
            log "DNS updated to point to ${to_region}"
        fi
    fi
    
    # Update any API Gateway or ALB routing
    log "Routing update completed"
}

start_services() {
    local region="$1"
    local context="maestro-${region}"
    
    log "Starting services in region: ${region}"
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN: Would start services in ${region}"
        return
    fi
    
    kubectl config use-context "${context}"
    
    # Scale up services
    kubectl scale deployment maestro-server -n "${NAMESPACE}" --replicas=3
    kubectl scale deployment maestro-gateway -n "${NAMESPACE}" --replicas=2
    kubectl scale deployment maestro-worker -n "${NAMESPACE}" --replicas=2
    
    # Wait for services to be ready
    kubectl rollout status deployment/maestro-server -n "${NAMESPACE}" --timeout=600s || error "Failed to start server"
    kubectl rollout status deployment/maestro-gateway -n "${NAMESPACE}" --timeout=300s || error "Failed to start gateway"
    kubectl rollout status deployment/maestro-worker -n "${NAMESPACE}" --timeout=300s || error "Failed to start worker"
    
    # Remove maintenance mode from ingress
    kubectl patch ingress maestro-ingress -n "${NAMESPACE}" \
        --type='json' \
        -p='[{"op": "remove", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1server-snippet"}]' || true
    
    log "Services started successfully in region: ${region}"
}

verify_failover() {
    local region="$1"
    local context="maestro-${region}"
    
    log "Verifying failover to region: ${region}"
    
    kubectl config use-context "${context}"
    
    # Check all pods are running
    local not_ready=$(kubectl get pods -n "${NAMESPACE}" -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
    if [ -n "${not_ready}" ]; then
        log "WARNING: Some pods are not running: ${not_ready}"
    fi
    
    # Test database connectivity
    kubectl exec -n "${NAMESPACE}" deployment/maestro-server -c server -- \
        node -e "
        const { Pool } = require('pg');
        const pool = new Pool();
        pool.query('SELECT version()', (err, result) => {
            if (err) { process.exit(1); }
            console.log('PostgreSQL OK');
            pool.end();
        });
        " || error "PostgreSQL connectivity test failed"
    
    # Test Neo4j connectivity
    kubectl exec -n "${NAMESPACE}" deployment/maestro-neo4j -c neo4j -- \
        cypher-shell -u neo4j -p password "RETURN 'Neo4j OK' as status;" || error "Neo4j connectivity test failed"
    
    # Test API endpoints
    local api_endpoint=$(kubectl get ingress maestro-ingress -n "${NAMESPACE}" -o jsonpath='{.spec.rules[0].host}')
    if [ -n "${api_endpoint}" ]; then
        if curl -s "https://${api_endpoint}/health" | grep -q "ok"; then
            log "API endpoint is responding"
        else
            error "API endpoint is not responding"
        fi
    fi
    
    log "Failover verification completed successfully"
}

perform_rollback() {
    log "Performing rollback of previous failover..."
    
    local state=$(load_state)
    if [ "${state}" != "failover_complete" ]; then
        error "No valid failover state found to rollback"
    fi
    
    # Extract previous state
    local prev_primary=$(jq -r '.primary_region' "${STATE_FILE}")
    local prev_failover=$(jq -r '.failover_region' "${STATE_FILE}")
    
    log "Rolling back from ${prev_failover} to ${prev_primary}"
    
    if [ "${DRY_RUN}" = false ]; then
        confirm "Proceed with rollback from ${prev_failover} to ${prev_primary}?"
    fi
    
    # Perform reverse failover
    PRIMARY_REGION="${prev_failover}"
    FAILOVER_REGION="${prev_primary}"
    
    perform_failover
    
    # Clear state file
    rm -f "${STATE_FILE}"
    log "Rollback completed"
}

perform_failover() {
    local start_time=$(date +%s)
    
    log "=== MAESTRO FAILOVER STARTED ==="
    log "Primary region: ${PRIMARY_REGION}"
    log "Failover region: ${FAILOVER_REGION}"
    
    save_state "started" "{}"
    
    # Step 1: Health check target region
    log "Step 1/7: Checking target region health..."
    check_region_health "${FAILOVER_REGION}"
    save_state "health_checked" "{}"
    
    # Step 2: Stop write traffic in primary
    log "Step 2/7: Stopping write traffic in primary region..."
    stop_write_traffic "${PRIMARY_REGION}"
    save_state "traffic_stopped" "{}"
    
    # Step 3: Final backup
    log "Step 3/7: Performing final backup..."
    perform_final_backup "${PRIMARY_REGION}"
    save_state "backup_complete" "{}"
    
    # Step 4: Promote replicas
    log "Step 4/7: Promoting read replicas to primary..."
    promote_read_replica "${FAILOVER_REGION}"
    save_state "replica_promoted" "{}"
    
    # Step 5: Update routing
    log "Step 5/7: Updating DNS and routing..."
    update_routing "${PRIMARY_REGION}" "${FAILOVER_REGION}"
    save_state "routing_updated" "{}"
    
    # Step 6: Start services in target region
    log "Step 6/7: Starting services in target region..."
    start_services "${FAILOVER_REGION}"
    save_state "services_started" "{}"
    
    # Step 7: Verify failover
    log "Step 7/7: Verifying failover success..."
    verify_failover "${FAILOVER_REGION}"
    save_state "failover_complete" "{}"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    cat << EOF

=== MAESTRO FAILOVER COMPLETED ===
Duration: ${duration} seconds (Target RTO: ≤ 1800 seconds)
Primary region (old): ${PRIMARY_REGION}
Primary region (new): ${FAILOVER_REGION}
Status: SUCCESS

Next steps:
1. Monitor system health in new region
2. Update monitoring dashboards
3. Notify stakeholders
4. Plan replica setup in old primary region

To rollback: $0 --rollback
=====================================

EOF
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--primary)
                PRIMARY_REGION="$2"
                shift 2
                ;;
            -f|--failover)
                FAILOVER_REGION="$2"
                shift 2
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    if [ "${DRY_RUN}" = true ]; then
        log "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Handle rollback
    if [ "${ROLLBACK}" = true ]; then
        perform_rollback
        exit 0
    fi
    
    # Validate required parameters
    if [ -z "${PRIMARY_REGION}" ] || [ -z "${FAILOVER_REGION}" ]; then
        error "Both primary and failover regions must be specified"
    fi
    
    if [ "${PRIMARY_REGION}" = "${FAILOVER_REGION}" ]; then
        error "Primary and failover regions cannot be the same"
    fi
    
    # Confirm failover
    if [ "${DRY_RUN}" = false ]; then
        confirm "Proceed with failover from ${PRIMARY_REGION} to ${FAILOVER_REGION}?"
    fi
    
    # Perform the failover
    perform_failover
}

# Run main function
main "$@"