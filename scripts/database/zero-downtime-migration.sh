#!/bin/bash

# IntelGraph Maestro Zero-Downtime Database Migration System
# Comprehensive database migration strategy with automated rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATION_LOG_DIR="$PROJECT_ROOT/logs/migrations"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_ID="migration_${TIMESTAMP}"

# Database configuration
DB_HOST="${DB_HOST:-postgres-conductor.intelgraph-prod.svc.cluster.local}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-maestro_conductor_prod}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_MIGRATION_USER="${DB_MIGRATION_USER:-migrations}"
DB_REPLICA_HOST="${DB_REPLICA_HOST:-postgres-conductor-replica.intelgraph-prod.svc.cluster.local}"

# Migration configuration
MIGRATION_TIMEOUT="${MIGRATION_TIMEOUT:-1800}" # 30 minutes
ROLLBACK_ENABLED="${ROLLBACK_ENABLED:-true}"
BACKUP_BEFORE_MIGRATION="${BACKUP_BEFORE_MIGRATION:-true}"
VALIDATE_AFTER_MIGRATION="${VALIDATE_AFTER_MIGRATION:-true}"
PARALLEL_MIGRATIONS="${PARALLEL_MIGRATIONS:-false}"
MAINTENANCE_WINDOW="${MAINTENANCE_WINDOW:-false}"

# Kubernetes configuration
K8S_NAMESPACE="${K8S_NAMESPACE:-intelgraph-prod}"
APP_DEPLOYMENT="${APP_DEPLOYMENT:-maestro-conductor}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$MIGRATION_LOG_DIR/${MIGRATION_ID}.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$MIGRATION_LOG_DIR/${MIGRATION_ID}.log" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$MIGRATION_LOG_DIR/${MIGRATION_ID}.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$MIGRATION_LOG_DIR/${MIGRATION_ID}.log"
}

# Initialize migration environment
initialize_migration() {
    log "🚀 Initializing zero-downtime migration environment"
    
    # Create log directory
    mkdir -p "$MIGRATION_LOG_DIR"
    
    # Create migration state directory
    mkdir -p "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID"
    
    # Validate environment
    validate_environment
    
    # Create migration metadata
    cat > "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/metadata.json" << EOF
{
    "migration_id": "$MIGRATION_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "database": {
        "host": "$DB_HOST",
        "port": "$DB_PORT", 
        "name": "$DB_NAME"
    },
    "configuration": {
        "rollback_enabled": $ROLLBACK_ENABLED,
        "backup_enabled": $BACKUP_BEFORE_MIGRATION,
        "validation_enabled": $VALIDATE_AFTER_MIGRATION,
        "parallel_enabled": $PARALLEL_MIGRATIONS,
        "maintenance_window": $MAINTENANCE_WINDOW
    },
    "status": "initialized",
    "phases": []
}
EOF
    
    success "Migration environment initialized: $MIGRATION_ID"
}

# Validate migration environment
validate_environment() {
    log "🔍 Validating migration environment"
    
    # Check database connectivity
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        error "Cannot connect to primary database"
        exit 1
    fi
    
    # Check replica connectivity if available
    if [ -n "$DB_REPLICA_HOST" ]; then
        if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_REPLICA_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            warning "Cannot connect to replica database - continuing without replica validation"
            DB_REPLICA_HOST=""
        fi
    fi
    
    # Check Kubernetes access
    if ! kubectl get deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" >/dev/null 2>&1; then
        error "Cannot access application deployment in Kubernetes"
        exit 1
    fi
    
    # Check migration lock
    check_migration_lock
    
    # Validate pending migrations
    validate_pending_migrations
    
    success "Environment validation completed"
}

# Check for existing migration locks
check_migration_lock() {
    log "🔒 Checking migration locks"
    
    local lock_query="SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'migration_locks';"
    local lock_exists=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$lock_query" | xargs)
    
    if [ "$lock_exists" = "1" ]; then
        local active_locks=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM migration_locks WHERE released_at IS NULL;" | xargs)
        
        if [ "$active_locks" -gt "0" ]; then
            error "Active migration lock detected - another migration may be in progress"
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM migration_locks WHERE released_at IS NULL;"
            exit 1
        fi
    else
        # Create migration locks table if it doesn't exist
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS migration_locks (
    id SERIAL PRIMARY KEY,
    migration_id VARCHAR(255) NOT NULL,
    locked_by VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    released_at TIMESTAMP WITH TIME ZONE NULL,
    metadata JSONB
);
EOF
    fi
    
    success "Migration lock check completed"
}

# Validate pending migrations
validate_pending_migrations() {
    log "📋 Validating pending migrations"
    
    local migrations_dir="$PROJECT_ROOT/database/migrations"
    
    if [ ! -d "$migrations_dir" ]; then
        error "Migrations directory not found: $migrations_dir"
        exit 1
    fi
    
    # Count pending migrations
    local pending_count=$(find "$migrations_dir" -name "*.sql" -type f | wc -l)
    
    if [ "$pending_count" -eq 0 ]; then
        warning "No migration files found"
        exit 0
    fi
    
    log "Found $pending_count migration file(s) to process"
    
    # Validate migration file format
    for migration_file in "$migrations_dir"/*.sql; do
        if [ -f "$migration_file" ]; then
            local filename=$(basename "$migration_file")
            log "Validating migration: $filename"
            
            # Check for required migration structure
            if ! grep -q "-- Migration:" "$migration_file"; then
                error "Invalid migration format in $filename - missing '-- Migration:' header"
                exit 1
            fi
            
            # Check for rollback section
            if [ "$ROLLBACK_ENABLED" = "true" ] && ! grep -q "-- Rollback:" "$migration_file"; then
                warning "No rollback section found in $filename"
            fi
        fi
    done
    
    success "Migration validation completed"
}

# Acquire migration lock
acquire_migration_lock() {
    log "🔐 Acquiring migration lock"
    
    local lock_metadata=$(cat << EOF
{
    "migration_id": "$MIGRATION_ID",
    "hostname": "$(hostname)",
    "user": "$(whoami)",
    "kubernetes_context": "$(kubectl config current-context 2>/dev/null || echo 'unknown')",
    "environment_vars": {
        "K8S_NAMESPACE": "$K8S_NAMESPACE",
        "APP_DEPLOYMENT": "$APP_DEPLOYMENT"
    }
}
EOF
)
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
INSERT INTO migration_locks (migration_id, locked_by, metadata)
VALUES ('$MIGRATION_ID', '$(whoami)@$(hostname)', '$lock_metadata'::jsonb);
EOF
    
    success "Migration lock acquired: $MIGRATION_ID"
}

# Release migration lock
release_migration_lock() {
    log "🔓 Releasing migration lock"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
UPDATE migration_locks 
SET released_at = NOW() 
WHERE migration_id = '$MIGRATION_ID' AND released_at IS NULL;
EOF
    
    success "Migration lock released"
}

# Create database backup
create_backup() {
    if [ "$BACKUP_BEFORE_MIGRATION" = "false" ]; then
        log "📦 Backup disabled, skipping"
        return 0
    fi
    
    log "📦 Creating database backup"
    
    local backup_dir="$PROJECT_ROOT/database/backups"
    mkdir -p "$backup_dir"
    
    local backup_file="$backup_dir/${DB_NAME}_pre_migration_${MIGRATION_ID}.sql"
    
    log "Creating backup: $backup_file"
    
    if ! PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="${backup_file}.dump"; then
        error "Database backup failed"
        exit 1
    fi
    
    # Also create a plain SQL backup for easier inspection
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=plain \
        --file="$backup_file"
    
    # Compress the SQL backup
    gzip "$backup_file"
    
    # Save backup metadata
    cat > "$backup_dir/${MIGRATION_ID}_backup_metadata.json" << EOF
{
    "migration_id": "$MIGRATION_ID",
    "backup_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "database": {
        "host": "$DB_HOST",
        "name": "$DB_NAME",
        "size_bytes": $(du -b "${backup_file}.dump" | cut -f1),
        "compressed_size_bytes": $(du -b "${backup_file}.gz" | cut -f1)
    },
    "files": {
        "dump_file": "${backup_file}.dump",
        "sql_file": "${backup_file}.gz"
    }
}
EOF
    
    success "Database backup completed: ${backup_file}.dump"
}

# Enable application maintenance mode
enable_maintenance_mode() {
    if [ "$MAINTENANCE_WINDOW" = "false" ]; then
        log "🏗️ Maintenance mode disabled, continuing with zero-downtime strategy"
        return 0
    fi
    
    log "🏗️ Enabling application maintenance mode"
    
    # Scale down application pods to minimum
    local current_replicas=$(kubectl get deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" -o jsonpath='{.spec.replicas}')
    echo "$current_replicas" > "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/original_replicas.txt"
    
    # Add maintenance mode annotation
    kubectl annotate deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" \
        "intelgraph.io/maintenance-mode=true" \
        "intelgraph.io/maintenance-started=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --overwrite
    
    # Update deployment with maintenance image or configuration
    # (This would be customized based on your application's maintenance mode implementation)
    
    success "Application maintenance mode enabled"
}

# Disable application maintenance mode
disable_maintenance_mode() {
    if [ "$MAINTENANCE_WINDOW" = "false" ]; then
        return 0
    fi
    
    log "🏗️ Disabling application maintenance mode"
    
    # Remove maintenance mode annotations
    kubectl annotate deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" \
        "intelgraph.io/maintenance-mode-" \
        "intelgraph.io/maintenance-started-" \
        2>/dev/null || true
    
    # Restore original replica count
    if [ -f "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/original_replicas.txt" ]; then
        local original_replicas=$(cat "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/original_replicas.txt")
        kubectl scale deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" --replicas="$original_replicas"
    fi
    
    success "Application maintenance mode disabled"
}

# Execute database migrations
execute_migrations() {
    log "🔄 Executing database migrations"
    
    local migrations_dir="$PROJECT_ROOT/database/migrations"
    local migration_results=()
    local failed_migrations=()
    
    # Create migration history table if it doesn't exist
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) NOT NULL,
    migration_id VARCHAR(255) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    rollback_sql TEXT,
    metadata JSONB
);
EOF
    
    # Process each migration file
    for migration_file in "$migrations_dir"/*.sql; do
        if [ ! -f "$migration_file" ]; then
            continue
        fi
        
        local filename=$(basename "$migration_file")
        local checksum=$(sha256sum "$migration_file" | cut -d' ' -f1)
        
        log "Processing migration: $filename"
        
        # Check if migration was already executed
        local already_executed=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM migration_history WHERE migration_file = '$filename' AND checksum = '$checksum';" | xargs)
        
        if [ "$already_executed" -gt "0" ]; then
            log "Migration $filename already executed, skipping"
            continue
        fi
        
        # Extract migration and rollback SQL
        local migration_sql=$(extract_migration_sql "$migration_file")
        local rollback_sql=$(extract_rollback_sql "$migration_file")
        
        # Execute migration with timing
        local start_time=$(date +%s%3N)
        
        if execute_single_migration "$filename" "$migration_sql" "$rollback_sql" "$checksum"; then
            local end_time=$(date +%s%3N)
            local execution_time=$((end_time - start_time))
            
            migration_results+=("$filename:SUCCESS:${execution_time}ms")
            
            # Record successful migration
            local metadata=$(cat << EOF
{
    "migration_id": "$MIGRATION_ID",
    "filename": "$filename",
    "checksum": "$checksum",
    "execution_time_ms": $execution_time
}
EOF
)
            
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
INSERT INTO migration_history (migration_file, migration_id, checksum, execution_time_ms, status, rollback_sql, metadata)
VALUES ('$filename', '$MIGRATION_ID', '$checksum', $execution_time, 'completed', \$rollback\$$rollback_sql\$rollback\$, '$metadata'::jsonb);
EOF
            
            success "Migration completed: $filename (${execution_time}ms)"
        else
            failed_migrations+=("$filename")
            migration_results+=("$filename:FAILED:0ms")
            error "Migration failed: $filename"
            
            if [ "$ROLLBACK_ENABLED" = "true" ]; then
                log "Starting rollback process due to migration failure"
                rollback_migrations
                exit 1
            else
                error "Migration failed and rollback is disabled"
                exit 1
            fi
        fi
    done
    
    # Save migration results
    printf "%s\n" "${migration_results[@]}" > "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/results.txt"
    
    if [ ${#failed_migrations[@]} -eq 0 ]; then
        success "All migrations executed successfully"
    else
        error "Some migrations failed: ${failed_migrations[*]}"
        exit 1
    fi
}

# Execute a single migration
execute_single_migration() {
    local filename="$1"
    local migration_sql="$2"
    local rollback_sql="$3"
    local checksum="$4"
    
    # Create a transaction for the migration
    local temp_sql_file="/tmp/migration_${MIGRATION_ID}_$(basename "$filename" .sql).sql"
    
    cat > "$temp_sql_file" << EOF
BEGIN;

-- Migration: $filename
-- Checksum: $checksum
-- Migration ID: $MIGRATION_ID

$migration_sql

COMMIT;
EOF
    
    # Execute the migration
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$temp_sql_file" 2>&1 | tee -a "$MIGRATION_LOG_DIR/${MIGRATION_ID}.log"; then
        rm -f "$temp_sql_file"
        return 0
    else
        rm -f "$temp_sql_file"
        return 1
    fi
}

# Extract migration SQL from file
extract_migration_sql() {
    local file="$1"
    
    # Extract everything between "-- Migration:" and "-- Rollback:" (or end of file)
    awk '/-- Migration:/{flag=1; next} /-- Rollback:/{flag=0} flag' "$file"
}

# Extract rollback SQL from file
extract_rollback_sql() {
    local file="$1"
    
    # Extract everything after "-- Rollback:"
    awk '/-- Rollback:/{flag=1; next} flag' "$file"
}

# Validate migrations after execution
validate_migrations() {
    if [ "$VALIDATE_AFTER_MIGRATION" = "false" ]; then
        log "🔍 Post-migration validation disabled, skipping"
        return 0
    fi
    
    log "🔍 Validating migrations"
    
    # Basic database connectivity test
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        error "Database connectivity lost after migration"
        return 1
    fi
    
    # Run application health checks
    if ! validate_application_health; then
        error "Application health check failed after migration"
        return 1
    fi
    
    # Run custom validation queries if they exist
    local validation_dir="$PROJECT_ROOT/database/validations"
    if [ -d "$validation_dir" ]; then
        for validation_file in "$validation_dir"/*.sql; do
            if [ -f "$validation_file" ]; then
                local validation_name=$(basename "$validation_file" .sql)
                log "Running validation: $validation_name"
                
                if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$validation_file" >/dev/null 2>&1; then
                    error "Validation failed: $validation_name"
                    return 1
                fi
            fi
        done
    fi
    
    # Validate replica synchronization if replica exists
    if [ -n "$DB_REPLICA_HOST" ]; then
        validate_replica_sync
    fi
    
    success "Migration validation completed successfully"
}

# Validate application health
validate_application_health() {
    log "🏥 Validating application health"
    
    # Wait for pods to be ready
    if ! kubectl rollout status deployment "$APP_DEPLOYMENT" -n "$K8S_NAMESPACE" --timeout=300s; then
        error "Application deployment not ready after migration"
        return 1
    fi
    
    # Check application health endpoint
    local service_url="http://${APP_DEPLOYMENT}.${K8S_NAMESPACE}.svc.cluster.local:5000"
    local health_check_attempts=0
    local max_attempts=30
    
    while [ $health_check_attempts -lt $max_attempts ]; do
        if kubectl run health-check-pod --rm -i --restart=Never --image=curlimages/curl:latest -- \
            curl -s --max-time 10 "$service_url/health" >/dev/null 2>&1; then
            success "Application health check passed"
            return 0
        fi
        
        health_check_attempts=$((health_check_attempts + 1))
        sleep 10
    done
    
    error "Application health check failed after $max_attempts attempts"
    return 1
}

# Validate replica synchronization
validate_replica_sync() {
    log "🔄 Validating replica synchronization"
    
    # Check replication lag
    local lag_query="SELECT CASE WHEN pg_is_in_recovery() THEN EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) ELSE 0 END AS replication_lag_seconds;"
    
    local replica_lag=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_REPLICA_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$lag_query" | xargs)
    
    if (( $(echo "$replica_lag > 60" | bc -l) )); then
        warning "Replica lag is high: ${replica_lag}s"
    else
        success "Replica synchronization validated (lag: ${replica_lag}s)"
    fi
}

# Rollback migrations
rollback_migrations() {
    log "⏪ Starting migration rollback"
    
    # Get migrations to rollback (in reverse order)
    local migrations_to_rollback=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT migration_file FROM migration_history WHERE migration_id = '$MIGRATION_ID' ORDER BY executed_at DESC;")
    
    if [ -z "$migrations_to_rollback" ]; then
        warning "No migrations found to rollback"
        return 0
    fi
    
    local rollback_count=0
    
    while IFS= read -r migration_file; do
        migration_file=$(echo "$migration_file" | xargs) # Trim whitespace
        
        if [ -n "$migration_file" ]; then
            log "Rolling back migration: $migration_file"
            
            # Get rollback SQL from migration history
            local rollback_sql=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT rollback_sql FROM migration_history WHERE migration_file = '$migration_file' AND migration_id = '$MIGRATION_ID';")
            
            if [ -n "$rollback_sql" ] && [ "$rollback_sql" != " " ]; then
                # Execute rollback
                local temp_rollback_file="/tmp/rollback_${MIGRATION_ID}_$(basename "$migration_file" .sql).sql"
                
                cat > "$temp_rollback_file" << EOF
BEGIN;

-- Rollback for: $migration_file
-- Migration ID: $MIGRATION_ID

$rollback_sql

COMMIT;
EOF
                
                if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$temp_rollback_file" 2>&1 | tee -a "$MIGRATION_LOG_DIR/${MIGRATION_ID}_rollback.log"; then
                    # Mark as rolled back
                    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
UPDATE migration_history 
SET status = 'rolled_back' 
WHERE migration_file = '$migration_file' AND migration_id = '$MIGRATION_ID';
EOF
                    
                    rollback_count=$((rollback_count + 1))
                    success "Rolled back migration: $migration_file"
                else
                    error "Failed to rollback migration: $migration_file"
                fi
                
                rm -f "$temp_rollback_file"
            else
                warning "No rollback SQL found for migration: $migration_file"
            fi
        fi
    done <<< "$migrations_to_rollback"
    
    if [ $rollback_count -gt 0 ]; then
        success "Rollback completed: $rollback_count migrations rolled back"
    else
        warning "No migrations were rolled back"
    fi
}

# Cleanup migration artifacts
cleanup() {
    log "🧹 Cleaning up migration artifacts"
    
    # Release migration lock
    release_migration_lock 2>/dev/null || true
    
    # Disable maintenance mode
    disable_maintenance_mode 2>/dev/null || true
    
    # Remove temporary files
    rm -f /tmp/migration_${MIGRATION_ID}_*.sql
    rm -f /tmp/rollback_${MIGRATION_ID}_*.sql
    
    # Compress log files older than 30 days
    find "$MIGRATION_LOG_DIR" -name "*.log" -type f -mtime +30 -exec gzip {} \; 2>/dev/null || true
    
    log "Cleanup completed"
}

# Generate migration report
generate_report() {
    log "📊 Generating migration report"
    
    local report_file="$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/report.json"
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    cat > "$report_file" << EOF
{
    "migration_id": "$MIGRATION_ID",
    "start_time": "$(jq -r '.timestamp' "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/metadata.json")",
    "end_time": "$end_time",
    "status": "completed",
    "configuration": $(jq '.configuration' "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/metadata.json"),
    "database": $(jq '.database' "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/metadata.json"),
    "results": {
        "migrations_executed": $([ -f "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/results.txt" ] && grep -c "SUCCESS" "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/results.txt" || echo 0),
        "migrations_failed": $([ -f "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/results.txt" ] && grep -c "FAILED" "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/results.txt" || echo 0),
        "total_execution_time": "$([ -f "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/results.txt" ] && awk -F: '{gsub(/ms/, "", $3); total+=$3} END {print total "ms"}' "$PROJECT_ROOT/database/migration-state/$MIGRATION_ID/results.txt" || echo "0ms")"
    },
    "artifacts": {
        "log_file": "$MIGRATION_LOG_DIR/${MIGRATION_ID}.log",
        "backup_created": $BACKUP_BEFORE_MIGRATION,
        "validation_passed": $VALIDATE_AFTER_MIGRATION
    }
}
EOF
    
    success "Migration report generated: $report_file"
}

# Main migration function
main() {
    log "🚀 Starting IntelGraph Zero-Downtime Database Migration"
    log "Migration ID: $MIGRATION_ID"
    log "Target Database: $DB_HOST:$DB_PORT/$DB_NAME"
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Execute migration pipeline
    initialize_migration
    acquire_migration_lock
    create_backup
    enable_maintenance_mode
    
    if ! execute_migrations; then
        error "Migration execution failed"
        exit 1
    fi
    
    disable_maintenance_mode
    
    if ! validate_migrations; then
        error "Migration validation failed"
        if [ "$ROLLBACK_ENABLED" = "true" ]; then
            log "Starting rollback due to validation failure"
            enable_maintenance_mode
            rollback_migrations
            disable_maintenance_mode
        fi
        exit 1
    fi
    
    generate_report
    
    success "🎉 Zero-downtime database migration completed successfully"
    success "Migration ID: $MIGRATION_ID"
    success "Log file: $MIGRATION_LOG_DIR/${MIGRATION_ID}.log"
}

# Help function
show_help() {
    cat << EOF
IntelGraph Zero-Downtime Database Migration

Usage: $0 [OPTIONS]

Options:
    --host HOST                 Database host (default: postgres-conductor.intelgraph-prod.svc.cluster.local)
    --port PORT                 Database port (default: 5432)
    --database NAME             Database name (default: maestro_conductor_prod)
    --user USER                 Database user (default: postgres)
    --password PASSWORD         Database password
    --namespace NAMESPACE       Kubernetes namespace (default: intelgraph-prod)
    --deployment NAME           Application deployment name (default: maestro-conductor)
    --timeout SECONDS           Migration timeout (default: 1800)
    --no-backup                 Skip database backup
    --no-rollback               Disable automatic rollback on failure
    --no-validation             Skip post-migration validation
    --maintenance-mode          Enable maintenance window (not zero-downtime)
    --parallel                  Enable parallel migration execution
    --help                      Show this help message

Environment Variables:
    DB_HOST                     Database host
    DB_PORT                     Database port
    DB_NAME                     Database name
    DB_USER                     Database user
    DB_PASSWORD                 Database password
    K8S_NAMESPACE               Kubernetes namespace
    APP_DEPLOYMENT              Application deployment name
    MIGRATION_TIMEOUT           Migration timeout in seconds
    ROLLBACK_ENABLED            Enable/disable rollback (true/false)
    BACKUP_BEFORE_MIGRATION     Enable/disable backup (true/false)
    VALIDATE_AFTER_MIGRATION    Enable/disable validation (true/false)
    MAINTENANCE_WINDOW          Enable/disable maintenance mode (true/false)

Examples:
    $0 --no-backup --timeout 3600
    DB_PASSWORD=secret $0 --maintenance-mode
    $0 --host localhost --port 5432 --database test_db

Migration File Format:
    Migration files should be placed in database/migrations/ and follow this format:
    
    -- Migration: Description of the migration
    CREATE TABLE new_table (...);
    -- Add other migration statements here
    
    -- Rollback: Rollback instructions
    DROP TABLE new_table;
    -- Add other rollback statements here

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --database)
            DB_NAME="$2"
            shift 2
            ;;
        --user)
            DB_USER="$2"
            shift 2
            ;;
        --password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --namespace)
            K8S_NAMESPACE="$2"
            shift 2
            ;;
        --deployment)
            APP_DEPLOYMENT="$2"
            shift 2
            ;;
        --timeout)
            MIGRATION_TIMEOUT="$2"
            shift 2
            ;;
        --no-backup)
            BACKUP_BEFORE_MIGRATION="false"
            shift
            ;;
        --no-rollback)
            ROLLBACK_ENABLED="false"
            shift
            ;;
        --no-validation)
            VALIDATE_AFTER_MIGRATION="false"
            shift
            ;;
        --maintenance-mode)
            MAINTENANCE_WINDOW="true"
            shift
            ;;
        --parallel)
            PARALLEL_MIGRATIONS="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$DB_PASSWORD" ]; then
    error "Database password is required. Set DB_PASSWORD environment variable or use --password option"
    exit 1
fi

# Run main function
main "$@"