#!/bin/bash
# DR Drill script for IntelGraph
# Updated to use Enhanced Backup/Restore System

set -euo pipefail

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
    echo -e "${PURPLE}[DR DRILL]${NC} $1"
}

# Main execution
main() {
    log_header "Starting IntelGraph DR Drill..."

    # 1. Stop all IntelGraph services
    log_info "Stopping all IntelGraph services..."
    if [ -f "docker-compose.dev.yml" ]; then
        docker compose -f docker-compose.dev.yml down --volumes --remove-orphans || true
    fi
    # Also try stopping if running via other means
    docker stop neo4j postgres redis 2>/dev/null || true

    # 2. Perform comprehensive backup
    log_header "Performing comprehensive backup..."
    BACKUP_START_TIME=$(date +%s)

    # Use the enhanced backup script
    ./scripts/backup-enhanced.sh --set=full

    BACKUP_END_TIME=$(date +%s)
    BACKUP_DURATION=$((BACKUP_END_TIME - BACKUP_START_TIME))
    log_success "Backup completed in ${BACKUP_DURATION} seconds."

    # Get the latest backup ID
    # Assuming backups are in ./backups/ and start with summit-backup-full-
    LATEST_BACKUP_DIR=$(ls -td ./backups/summit-backup-full-* | head -1)

    if [ -z "$LATEST_BACKUP_DIR" ]; then
        log_error "No backup directory found!"
        exit 1
    fi

    LATEST_BACKUP_ID=$(basename "$LATEST_BACKUP_DIR")
    log_info "Latest Backup ID: ${LATEST_BACKUP_ID}"

    # 3. Simulate data loss (remove volumes)
    log_header "Simulating data loss by removing Docker volumes..."
    
    # Get volume names dynamically
    NEO4J_DATA_VOLUME=$(docker volume ls -q -f "name=intelgraph_neo4j_dev_data" -f "name=summit_neo4j_data")
    POSTGRES_DATA_VOLUME=$(docker volume ls -q -f "name=intelgraph_postgres_dev_data" -f "name=summit_postgres_data")
    REDIS_DATA_VOLUME=$(docker volume ls -q -f "name=intelgraph_redis_dev_data" -f "name=summit_redis_data")

    for vol in $NEO4J_DATA_VOLUME $POSTGRES_DATA_VOLUME $REDIS_DATA_VOLUME; do
        if [ -n "$vol" ]; then
            log_info "Removing volume: $vol"
            docker volume rm "$vol" || true
        fi
    done

    log_success "Docker volumes removed (if they existed)."

    # 4. Perform comprehensive restore
    log_header "Performing comprehensive restore..."
    RESTORE_START_TIME=$(date +%s)

    # Use the enhanced restore script
    # Run in verification mode first? No, we want actual restore.
    # We use env=dr_rehearsal to signal this is a drill
    ./scripts/restore-enhanced.sh "$LATEST_BACKUP_ID" --env=dr_rehearsal --mode=full

    RESTORE_END_TIME=$(date +%s)
    RESTORE_DURATION=$((RESTORE_END_TIME - RESTORE_START_TIME))
    log_success "Restore completed in ${RESTORE_DURATION} seconds."

    # 5. Restart all IntelGraph services
    log_header "Restarting IntelGraph services..."
    # The start.sh script handles starting all services and waiting for them to be healthy
    if [ -f "./start.sh" ]; then
        ./start.sh
    else
        log_warning "start.sh not found, attempting docker-compose up"
        docker compose -f docker-compose.dev.yml up -d
    fi

    # 6. Report RPO and RTO
    log_header "DR Drill Summary:"
    log_info "Backup Duration: ${BACKUP_DURATION} seconds"
    log_info "Restore Duration: ${RESTORE_DURATION} seconds"
    log_info "RPO: Point in time of backup ($LATEST_BACKUP_ID)"
    log_info "RTO: ${RESTORE_DURATION} seconds"

    TARGET_RTO=1800 # 30 minutes
    if (( RESTORE_DURATION <= TARGET_RTO )); then
        log_success "RTO of ${RESTORE_DURATION} seconds meets the target of ${TARGET_RTO} seconds."
    else
        log_warning "RTO of ${RESTORE_DURATION} seconds exceeds the target of ${TARGET_RTO} seconds."
    fi

    log_success "IntelGraph DR Drill complete!"
}

# Call main function
main "$@"
