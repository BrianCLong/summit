#!/bin/bash

# IntelGraph Automated Backup Script
# Performs comprehensive backups of all data and configurations

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="intelgraph_backup_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Create backup directory structure
create_backup_structure() {
    log "Creating backup directory structure..."
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"/{postgres,neo4j,redis,app,config}
}

# Backup PostgreSQL
backup_postgres() {
    log "Backing up PostgreSQL database..."
    
    if command -v pg_dump &> /dev/null; then
        PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
            -h postgres \
            -U intelgraph \
            -d intelgraph_prod \
            --no-password \
            --verbose \
            --format=custom \
            --compress=9 \
            > "${BACKUP_DIR}/${BACKUP_NAME}/postgres/intelgraph_prod.dump"
        
        # Also create a readable SQL dump
        PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
            -h postgres \
            -U intelgraph \
            -d intelgraph_prod \
            --no-password \
            --verbose \
            --format=plain \
            > "${BACKUP_DIR}/${BACKUP_NAME}/postgres/intelgraph_prod.sql"
        
        log "PostgreSQL backup completed"
    else
        error "pg_dump not available, skipping PostgreSQL backup"
    fi
}

# Backup Neo4j
backup_neo4j() {
    log "Backing up Neo4j database..."
    
    # Copy Neo4j data directory
    if [ -d "/neo4j-data" ]; then
        cp -r /neo4j-data/* "${BACKUP_DIR}/${BACKUP_NAME}/neo4j/" 2>/dev/null || true
        log "Neo4j data directory backed up"
    else
        warn "Neo4j data directory not found"
    fi
    
    # Export Neo4j database using cypher-shell if available
    if command -v cypher-shell &> /dev/null; then
        cypher-shell -u neo4j -p "${NEO4J_PASSWORD}" \
            "CALL apoc.export.cypher.all('${BACKUP_DIR}/${BACKUP_NAME}/neo4j/export.cypher', {})" \
            2>/dev/null || warn "Neo4j export failed, using data directory only"
    fi
}

# Backup Redis
backup_redis() {
    log "Backing up Redis..."
    
    if command -v redis-cli &> /dev/null; then
        # Force a BGSAVE
        redis-cli -h redis -a "${REDIS_PASSWORD}" BGSAVE || warn "Redis BGSAVE failed"
        
        # Wait for background save to complete
        sleep 5
        
        # Copy the dump file
        if [ -f "/redis-data/dump.rdb" ]; then
            cp /redis-data/dump.rdb "${BACKUP_DIR}/${BACKUP_NAME}/redis/"
            log "Redis backup completed"
        else
            warn "Redis dump file not found"
        fi
    else
        error "redis-cli not available, skipping Redis backup"
    fi
}

# Backup application data
backup_app_data() {
    log "Backing up application data..."
    
    # Backup uploaded files
    if [ -d "/app-uploads" ]; then
        cp -r /app-uploads/* "${BACKUP_DIR}/${BACKUP_NAME}/app/uploads/" 2>/dev/null || true
        log "Application uploads backed up"
    fi
    
    # Backup configuration files
    if [ -f "/.env" ]; then
        cp /.env "${BACKUP_DIR}/${BACKUP_NAME}/config/" 2>/dev/null || true
    fi
    
    if [ -f "/app/package.json" ]; then
        cp /app/package.json "${BACKUP_DIR}/${BACKUP_NAME}/config/" 2>/dev/null || true
    fi
    
    log "Application data backup completed"
}

# Create backup metadata
create_backup_metadata() {
    log "Creating backup metadata..."
    
    cat > "${BACKUP_DIR}/${BACKUP_NAME}/backup_info.json" << EOF
{
    "timestamp": "${TIMESTAMP}",
    "date": "$(date -Iseconds)",
    "version": "1.0.0",
    "components": {
        "postgres": $([ -f "${BACKUP_DIR}/${BACKUP_NAME}/postgres/intelgraph_prod.dump" ] && echo "true" || echo "false"),
        "neo4j": $([ -d "${BACKUP_DIR}/${BACKUP_NAME}/neo4j" ] && echo "true" || echo "false"),
        "redis": $([ -f "${BACKUP_DIR}/${BACKUP_NAME}/redis/dump.rdb" ] && echo "true" || echo "false"),
        "app_data": $([ -d "${BACKUP_DIR}/${BACKUP_NAME}/app" ] && echo "true" || echo "false")
    },
    "size_mb": $(du -sm "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)
}
EOF
}

# Compress backup
compress_backup() {
    log "Compressing backup..."
    
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"
    
    # Remove uncompressed directory
    rm -rf "${BACKUP_NAME}/"
    
    log "Backup compressed to ${BACKUP_NAME}.tar.gz"
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    find "${BACKUP_DIR}" -name "intelgraph_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    log "Old backups cleaned up (retention: ${RETENTION_DAYS} days)"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    if tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" >/dev/null 2>&1; then
        log "Backup integrity verified"
        return 0
    else
        error "Backup integrity check failed"
        return 1
    fi
}

# Send notification (if configured)
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "${WEBHOOK_URL}" ]; then
        curl -X POST "${WEBHOOK_URL}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"IntelGraph Backup ${status}: ${message}\"}" \
            >/dev/null 2>&1 || warn "Failed to send notification"
    fi
}

# Main backup function
main() {
    log "Starting IntelGraph backup process..."
    
    # Check if backup directory exists
    if [ ! -d "${BACKUP_DIR}" ]; then
        mkdir -p "${BACKUP_DIR}"
    fi
    
    # Check disk space (require at least 1GB free)
    available_space=$(df "${BACKUP_DIR}" | awk 'NR==2 {print $4}')
    if [ "${available_space}" -lt 1048576 ]; then  # 1GB in KB
        error "Insufficient disk space for backup"
        send_notification "FAILED" "Insufficient disk space"
        exit 1
    fi
    
    # Create backup structure
    create_backup_structure
    
    # Perform backups
    backup_postgres
    backup_neo4j
    backup_redis
    backup_app_data
    
    # Create metadata
    create_backup_metadata
    
    # Compress backup
    compress_backup
    
    # Verify backup
    if verify_backup; then
        # Clean old backups
        cleanup_old_backups
        
        log "Backup process completed successfully"
        send_notification "SUCCESS" "Backup ${BACKUP_NAME}.tar.gz created"
    else
        error "Backup verification failed"
        send_notification "FAILED" "Backup verification failed"
        exit 1
    fi
}

# Set up cron job for automatic backups
setup_cron() {
    # Add cron job for daily backups at 2 AM
    echo "0 2 * * * /backup.sh > /var/log/backup.log 2>&1" | crontab -
    log "Cron job configured for daily backups at 2 AM"
}

# Command line options
case "${1:-}" in
    "cron")
        setup_cron
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [cron]"
        echo "  cron    Set up automatic daily backups"
        echo "  (no args) Run backup now"
        exit 1
        ;;
esac