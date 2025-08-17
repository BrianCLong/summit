#!/bin/bash
# DR Drill script for IntelGraph

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
    docker-compose -f docker-compose.dev.yml down --volumes --remove-orphans

    # 2. Perform backups
    log_header "Performing backups..."
    BACKUP_START_TIME=$(date +%s)

    ./scripts/backup/redis_backup.sh
    ./scripts/backup/neo4j_backup.sh
    ./scripts/backup/postgres_backup.sh

    BACKUP_END_TIME=$(date +%s)
    BACKUP_DURATION=$((BACKUP_END_TIME - BACKUP_START_TIME))
    log_success "All backups completed in ${BACKUP_DURATION} seconds."

    # Get the latest backup files for restore
    LATEST_REDIS_BACKUP=$(ls -t ./backups/redis/*.rdb | head -1)
    LATEST_NEO4J_BACKUP=$(ls -t ./backups/neo4j/*.dump | head -1)
    LATEST_POSTGRES_BACKUP=$(ls -t ./backups/postgres/*.sql | head -1)

    log_info "Latest Redis backup: ${LATEST_REDIS_BACKUP}"
    log_info "Latest Neo4j backup: ${LATEST_NEO4J_BACKUP}"
    log_info "Latest Postgres backup: ${LATEST_POSTGRES_BACKUP}"

    # 3. Simulate data loss (remove volumes)
    log_header "Simulating data loss by removing Docker volumes..."
    # Use `docker volume ls -q -f "name=intelgraph_neo4j_dev_data"` to get exact volume names
    # and then remove them. This is safer than hardcoding.
    # Also, ensure the volumes are actually removed.
    
    # Get volume names dynamically
    NEO4J_DATA_VOLUME=$(docker volume ls -q -f "name=intelgraph_neo4j_dev_data")
    NEO4J_LOGS_VOLUME=$(docker volume ls -q -f "name=intelgraph_neo4j_dev_logs")
    POSTGRES_DATA_VOLUME=$(docker volume ls -q -f "name=intelgraph_postgres_dev_data")
    REDIS_DATA_VOLUME=$(docker volume ls -q -f "name=intelgraph_redis_dev_data")

    if [ -n "$NEO4J_DATA_VOLUME" ]; then
        log_info "Removing Neo4j data volume: $NEO4J_DATA_VOLUME"
        docker volume rm "$NEO4J_DATA_VOLUME" || true
    fi
    if [ -n "$NEO4J_LOGS_VOLUME" ]; then
        log_info "Removing Neo4j logs volume: $NEO4J_LOGS_VOLUME"
        docker volume rm "$NEO4J_LOGS_VOLUME" || true
    fi
    if [ -n "$POSTGRES_DATA_VOLUME" ]; then
        log_info "Removing Postgres data volume: $POSTGRES_DATA_VOLUME"
        docker volume rm "$POSTGRES_DATA_VOLUME" || true
    fi
    if [ -n "$REDIS_DATA_VOLUME" ]; then
        log_info "Removing Redis data volume: $REDIS_DATA_VOLUME"
        docker volume rm "$REDIS_DATA_VOLUME" || true
    fi
    log_success "Docker volumes removed (if they existed)."

    # 4. Perform restores
    log_header "Performing restores..."
    RESTORE_START_TIME=$(date +%s)

    ./scripts/restore/redis_restore.sh "${LATEST_REDIS_BACKUP}"
    ./scripts/restore/neo4j_restore.sh "${LATEST_NEO4J_BACKUP}"
    ./scripts/restore/postgres_restore.sh "${LATEST_POSTGRES_BACKUP}"

    RESTORE_END_TIME=$(date +%s)
    RESTORE_DURATION=$((RESTORE_END_TIME - RESTORE_START_TIME))
    log_success "All restores completed in ${RESTORE_DURATION} seconds."

    # 5. Restart all IntelGraph services
    log_header "Restarting IntelGraph services..."
    # The start.sh script handles starting all services and waiting for them to be healthy
    ./start.sh

    # 6. Perform basic validation (check service status)
    log_header "Performing basic service validation..."
    # The start.sh script already includes show_service_status, which performs health checks.
    # We can add more specific validation here if needed, e.g., querying a known data point.
    log_info "Please check the output of the 'start.sh' script above for service health."
    log_info "You can also manually verify by accessing the application at http://localhost:3000"

    # 7. Report RPO and RTO
    log_header "DR Drill Summary:"
    log_info "Backup Duration: ${BACKUP_DURATION} seconds"
    log_info "Restore Duration: ${RESTORE_DURATION} seconds"
    log_info "RPO (Recovery Point Objective): This is determined by the frequency of your backups. For this drill, it's the point in time the backup was taken."
    log_info "RTO (Recovery Time Objective): ${RESTORE_DURATION} seconds (This should be compared against your target of 30 minutes)."

    if (( RESTORE_DURATION <= 1800 )); then # 30 minutes = 1800 seconds
        log_success "RTO of ${RESTORE_DURATION} seconds meets the target of 30 minutes."
    else
        log_warning "RTO of ${RESTORE_DURATION} seconds exceeds the target of 30 minutes."
    fi

    log_success "IntelGraph DR Drill complete!"
}

# Call main function
main "$@"
