#!/usr/bin/env bash
set -euo pipefail

# Enhanced Backup Script for Summit
# Supports full, minimal, tenant, project, and DR backup sets
# Integrates with backup-sets.yaml configuration

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_CONFIG="${BACKUP_CONFIG:-$PROJECT_ROOT/config/backup-sets.yaml}"
BACKUP_BASE="${BACKUP_BASE:-./backups}"
BACKUP_SET="${BACKUP_SET:-full}"
TENANT_ID="${TENANT_ID:-}"
PROJECT_ID="${PROJECT_ID:-}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
S3_BUCKET="${S3_BUCKET:-}"
DRY_RUN="${DRY_RUN:-false}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging
say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }
info() { printf "${CYAN}ℹ️  %s${NC}\n" "$*"; }

# Parse YAML config (basic parser)
parse_backup_set_config() {
    local backup_set="$1"

    if [ ! -f "$BACKUP_CONFIG" ]; then
        fail "Backup configuration not found: $BACKUP_CONFIG"
        exit 1
    fi

    info "Loading backup set configuration: $backup_set"

    # Export backup set for use in other functions
    export CURRENT_BACKUP_SET="$backup_set"
}

# Initialize backup with set configuration
init_backup() {
    local timestamp=$(date -u +%Y%m%dT%H%M%SZ)

    # Create backup ID based on set type
    if [ -n "$TENANT_ID" ]; then
        export BACKUP_ID="summit-backup-${BACKUP_SET}-tenant-${TENANT_ID}-${timestamp}"
    elif [ -n "$PROJECT_ID" ]; then
        export BACKUP_ID="summit-backup-${BACKUP_SET}-project-${PROJECT_ID}-${timestamp}"
    else
        export BACKUP_ID="summit-backup-${BACKUP_SET}-${timestamp}"
    fi

    export BACKUP_DIR="$BACKUP_BASE/$BACKUP_ID"

    if [ "$DRY_RUN" = "true" ]; then
        warn "DRY RUN MODE - No actual backups will be performed"
    fi

    mkdir -p "$BACKUP_DIR"

    say "🔄 Starting Summit Backup"
    say "Backup Set: $BACKUP_SET"
    say "Backup ID: $BACKUP_ID"

    # Write backup metadata
    cat > "$BACKUP_DIR/backup-metadata.json" << EOF
{
  "backup_id": "$BACKUP_ID",
  "backup_set": "$BACKUP_SET",
  "timestamp": "$(date -u -Iseconds)",
  "hostname": "$(hostname)",
  "user": "${USER:-unknown}",
  "tenant_id": "${TENANT_ID:-null}",
  "project_id": "${PROJECT_ID:-null}",
  "dry_run": $DRY_RUN,
  "encryption_enabled": $([ -n "$ENCRYPTION_KEY" ] && echo "true" || echo "false"),
  "components": []
}
EOF
}

# Backup Neo4j (full or filtered)
backup_neo4j() {
    local mode="${1:-full}"

    if [ "$mode" = "full" ]; then
        say "Backing up Neo4j (full database)"

        if [ "$DRY_RUN" = "true" ]; then
            info "Would backup full Neo4j database"
            return 0
        fi

        # Use neo4j-admin dump for full backup
        if docker exec neo4j sh -c 'neo4j-admin database dump neo4j --to-path=/tmp' 2>/dev/null; then
            docker cp neo4j:/tmp/neo4j.dump "$BACKUP_DIR/neo4j.dump"
            pass "Neo4j full database backup created"
        else
            fail "Neo4j backup failed"
            return 1
        fi

    elif [ "$mode" = "tenant" ]; then
        say "Backing up Neo4j (tenant: $TENANT_ID)"

        if [ -z "$TENANT_ID" ]; then
            fail "TENANT_ID required for tenant backup"
            return 1
        fi

        if [ "$DRY_RUN" = "true" ]; then
            info "Would backup Neo4j tenant data for: $TENANT_ID"
            return 0
        fi

        # Export tenant-specific graph data
        local cypher_query="MATCH (n) WHERE n.tenant_id = '\$tenant_id' WITH n MATCH (n)-[r]-(m) WHERE m.tenant_id = '\$tenant_id' RETURN n, r, m"

        docker exec neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}" \
            --param "tenant_id => '$TENANT_ID'" \
            "CALL apoc.export.cypher.query('$cypher_query', '/tmp/tenant-export.cypher', {format: 'cypher-shell'})" \
            > "$BACKUP_DIR/neo4j-tenant-${TENANT_ID}.cypher" 2>/dev/null || warn "Tenant export may be incomplete"

        if [ -s "$BACKUP_DIR/neo4j-tenant-${TENANT_ID}.cypher" ]; then
            pass "Neo4j tenant backup created"
        else
            fail "Neo4j tenant backup failed"
            return 1
        fi

    elif [ "$mode" = "project" ]; then
        say "Backing up Neo4j (project: $PROJECT_ID)"

        if [ -z "$PROJECT_ID" ]; then
            fail "PROJECT_ID required for project backup"
            return 1
        fi

        if [ "$DRY_RUN" = "true" ]; then
            info "Would backup Neo4j project data for: $PROJECT_ID"
            return 0
        fi

        # Export project-specific graph data
        local cypher_query="MATCH (n) WHERE n.project_id = '\$project_id' OR n.investigation_id = '\$project_id' WITH n MATCH (n)-[r]-(m) RETURN n, r, m"

        docker exec neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}" \
            --param "project_id => '$PROJECT_ID'" \
            "CALL apoc.export.cypher.query('$cypher_query', '/tmp/project-export.cypher', {format: 'cypher-shell'})" \
            > "$BACKUP_DIR/neo4j-project-${PROJECT_ID}.cypher" 2>/dev/null || warn "Project export may be incomplete"

        if [ -s "$BACKUP_DIR/neo4j-project-${PROJECT_ID}.cypher" ]; then
            pass "Neo4j project backup created"
        else
            fail "Neo4j project backup failed"
            return 1
        fi
    fi

    # Export graph statistics
    docker exec neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}" \
        "CALL db.stats.retrieve('GRAPH') YIELD section, data RETURN section, data" \
        > "$BACKUP_DIR/neo4j-stats.txt" 2>/dev/null || warn "Could not export graph statistics"
}

# Backup PostgreSQL (full, core, tenant, or project)
backup_postgres() {
    local mode="${1:-full}"

    local postgres_url="${POSTGRES_URL:-postgres://intelgraph:devpassword@localhost:5432/intelgraph_dev}"

    if [ "$mode" = "full" ]; then
        say "Backing up PostgreSQL (full database)"

        if [ "$DRY_RUN" = "true" ]; then
            info "Would backup full PostgreSQL database"
            return 0
        fi

        if command -v pg_dump >/dev/null 2>&1; then
            pg_dump "$postgres_url" --verbose --no-password --clean --create \
                -Fc -f "$BACKUP_DIR/postgres-full.dump"
        else
            docker exec postgres pg_dump -U "${POSTGRES_USER:-intelgraph}" \
                -d "${POSTGRES_DB:-intelgraph_dev}" --verbose --clean --create \
                -Fc -f /tmp/postgres-full.dump
            docker cp postgres:/tmp/postgres-full.dump "$BACKUP_DIR/"
        fi

        pass "PostgreSQL full database backup created"

    elif [ "$mode" = "core" ]; then
        say "Backing up PostgreSQL (core tables only)"

        if [ "$DRY_RUN" = "true" ]; then
            info "Would backup core PostgreSQL tables"
            return 0
        fi

        # Backup essential tables only
        local core_tables=("entities" "investigations" "users" "runs" "tasks" "runbooks")
        local table_args=""
        for table in "${core_tables[@]}"; do
            table_args="$table_args -t $table"
        done

        if command -v pg_dump >/dev/null 2>&1; then
            pg_dump "$postgres_url" --verbose --no-password $table_args \
                -Fc -f "$BACKUP_DIR/postgres-core.dump"
        else
            docker exec postgres pg_dump -U "${POSTGRES_USER:-intelgraph}" \
                -d "${POSTGRES_DB:-intelgraph_dev}" --verbose $table_args \
                -Fc -f /tmp/postgres-core.dump
            docker cp postgres:/tmp/postgres-core.dump "$BACKUP_DIR/"
        fi

        pass "PostgreSQL core tables backup created"

    elif [ "$mode" = "tenant" ]; then
        say "Backing up PostgreSQL (tenant: $TENANT_ID)"

        if [ -z "$TENANT_ID" ]; then
            fail "TENANT_ID required for tenant backup"
            return 1
        fi

        if [ "$DRY_RUN" = "true" ]; then
            info "Would backup PostgreSQL tenant data for: $TENANT_ID"
            return 0
        fi

        # Export tenant-specific data
        local dump_sql="$BACKUP_DIR/postgres-tenant-${TENANT_ID}.sql"

        cat > /tmp/export-tenant.sql << EOF
-- Tenant-specific data export for: $TENANT_ID
\\copy (SELECT * FROM entities WHERE tenant_id = '$TENANT_ID') TO '$dump_sql.entities.csv' CSV HEADER;
\\copy (SELECT * FROM investigations WHERE tenant_id = '$TENANT_ID') TO '$dump_sql.investigations.csv' CSV HEADER;
\\copy (SELECT * FROM users WHERE tenant_id = '$TENANT_ID') TO '$dump_sql.users.csv' CSV HEADER;
EOF

        if command -v psql >/dev/null 2>&1; then
            psql "$postgres_url" -f /tmp/export-tenant.sql
        else
            docker cp /tmp/export-tenant.sql postgres:/tmp/
            docker exec postgres psql -U "${POSTGRES_USER:-intelgraph}" \
                -d "${POSTGRES_DB:-intelgraph_dev}" -f /tmp/export-tenant.sql
            docker cp postgres:"$dump_sql.entities.csv" "$BACKUP_DIR/"
            docker cp postgres:"$dump_sql.investigations.csv" "$BACKUP_DIR/"
            docker cp postgres:"$dump_sql.users.csv" "$BACKUP_DIR/"
        fi

        pass "PostgreSQL tenant backup created"

    elif [ "$mode" = "project" ]; then
        say "Backing up PostgreSQL (project: $PROJECT_ID)"

        if [ -z "$PROJECT_ID" ]; then
            fail "PROJECT_ID required for project backup"
            return 1
        fi

        if [ "$DRY_RUN" = "true" ]; then
            info "Would backup PostgreSQL project data for: $PROJECT_ID"
            return 0
        fi

        # Export project-specific data
        local dump_sql="$BACKUP_DIR/postgres-project-${PROJECT_ID}.sql"

        cat > /tmp/export-project.sql << EOF
-- Project-specific data export for: $PROJECT_ID
\\copy (SELECT * FROM investigations WHERE id = '$PROJECT_ID') TO '$dump_sql.investigation.csv' CSV HEADER;
\\copy (SELECT * FROM runs WHERE investigation_id = '$PROJECT_ID') TO '$dump_sql.runs.csv' CSV HEADER;
\\copy (SELECT * FROM tasks WHERE investigation_id = '$PROJECT_ID') TO '$dump_sql.tasks.csv' CSV HEADER;
EOF

        if command -v psql >/dev/null 2>&1; then
            psql "$postgres_url" -f /tmp/export-project.sql
        else
            docker cp /tmp/export-project.sql postgres:/tmp/
            docker exec postgres psql -U "${POSTGRES_USER:-intelgraph}" \
                -d "${POSTGRES_DB:-intelgraph_dev}" -f /tmp/export-project.sql
            docker cp postgres:"$dump_sql.investigation.csv" "$BACKUP_DIR/"
            docker cp postgres:"$dump_sql.runs.csv" "$BACKUP_DIR/"
            docker cp postgres:"$dump_sql.tasks.csv" "$BACKUP_DIR/"
        fi

        pass "PostgreSQL project backup created"
    fi

    # Export table statistics
    echo "-- Table Statistics --" > "$BACKUP_DIR/postgres-stats.txt"
    if command -v psql >/dev/null 2>&1; then
        psql "$postgres_url" \
            -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;" \
            >> "$BACKUP_DIR/postgres-stats.txt" 2>/dev/null || warn "Could not export table statistics"
    else
        docker exec postgres psql -U "${POSTGRES_USER:-intelgraph}" \
            -d "${POSTGRES_DB:-intelgraph_dev}" \
            -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;" \
            >> "$BACKUP_DIR/postgres-stats.txt" 2>/dev/null || warn "Could not export table statistics"
    fi
}

# Backup TimescaleDB hypertables
backup_timescale() {
    say "Backing up TimescaleDB hypertables"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would backup TimescaleDB hypertables"
        return 0
    fi

    local postgres_url="${POSTGRES_URL:-postgres://intelgraph:devpassword@localhost:5432/intelgraph_dev}"

    # Backup TimescaleDB-specific tables
    local timescale_tables=("events" "temporal_patterns" "analytics_traces")

    for table in "${timescale_tables[@]}"; do
        say "Backing up hypertable: $table"

        if command -v pg_dump >/dev/null 2>&1; then
            pg_dump "$postgres_url" --verbose --no-password -t "$table" \
                -Fc -f "$BACKUP_DIR/timescale-${table}.dump"
        else
            docker exec postgres pg_dump -U "${POSTGRES_USER:-intelgraph}" \
                -d "${POSTGRES_DB:-intelgraph_dev}" --verbose -t "$table" \
                -Fc -f "/tmp/timescale-${table}.dump"
            docker cp "postgres:/tmp/timescale-${table}.dump" "$BACKUP_DIR/"
        fi

        pass "Hypertable $table backed up"
    done

    pass "TimescaleDB backup completed"
}

# Backup Redis
backup_redis() {
    local mode="${1:-full}"

    say "Backing up Redis ($mode)"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would backup Redis data"
        return 0
    fi

    local redis_url="${REDIS_URL:-redis://localhost:6379}"

    if command -v redis-cli >/dev/null 2>&1; then
        redis-cli -u "$redis_url" BGSAVE > /dev/null
        sleep 2
        redis-cli -u "$redis_url" --rdb "$BACKUP_DIR/redis.rdb" > /dev/null
        redis-cli -u "$redis_url" INFO > "$BACKUP_DIR/redis-info.txt"
    else
        docker exec redis redis-cli BGSAVE
        sleep 2
        docker cp redis:/data/dump.rdb "$BACKUP_DIR/redis.rdb"
        docker exec redis redis-cli INFO > "$BACKUP_DIR/redis-info.txt"
    fi

    pass "Redis backup created"
}

# Backup configuration
backup_config() {
    say "Backing up configuration files"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would backup configuration files"
        return 0
    fi

    mkdir -p "$BACKUP_DIR/config"

    local config_files=(
        "docker-compose*.yml"
        ".env"
        "Justfile"
        "config/backup-sets.yaml"
    )

    for pattern in "${config_files[@]}"; do
        for file in $pattern; do
            if [ -f "$file" ]; then
                cp "$file" "$BACKUP_DIR/config/" 2>/dev/null || warn "Could not backup $file"
            fi
        done
    done

    # Backup OPA policies
    if [ -d "server/src/conductor/security" ]; then
        cp -r "server/src/conductor/security" "$BACKUP_DIR/config/opa-policies" 2>/dev/null || warn "Could not backup OPA policies"
    fi

    pass "Configuration files backed up"
}

# Backup secrets (encrypted)
backup_secrets() {
    say "Backing up application secrets"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would backup secrets (encrypted)"
        return 0
    fi

    local secrets_file="$BACKUP_DIR/secrets.enc"
    local temp_secrets=$(mktemp)

    {
        echo "# Summit Application Secrets Backup"
        echo "# Generated: $(date -u -Iseconds)"
        echo ""

        if [ -f ".env" ]; then
            grep -E "(API_KEY|SECRET|PASSWORD|TOKEN)" .env || true
        fi

        if [ -d "/run/secrets" ]; then
            for secret_file in /run/secrets/*; do
                if [ -f "$secret_file" ]; then
                    echo "DOCKER_SECRET_$(basename "$secret_file")=$(cat "$secret_file" | base64 -w 0)"
                fi
            done
        fi
    } > "$temp_secrets"

    # Encrypt secrets if key provided
    if [ -n "$ENCRYPTION_KEY" ]; then
        if command -v gpg >/dev/null 2>&1; then
            gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
                --passphrase "$ENCRYPTION_KEY" --batch --yes \
                --output "$secrets_file" "$temp_secrets"
            pass "Secrets encrypted and backed up"
        else
            openssl enc -aes-256-cbc -salt -in "$temp_secrets" -out "$secrets_file" \
                -pass "pass:$ENCRYPTION_KEY" 2>/dev/null
            pass "Secrets encrypted with OpenSSL"
        fi
    else
        cp "$temp_secrets" "$secrets_file"
        warn "Secrets backed up without encryption (ENCRYPTION_KEY not set)"
    fi

    rm -f "$temp_secrets"
    chmod 600 "$secrets_file"
}

# Generate checksums
generate_checksums() {
    say "Generating integrity checksums"

    if [ "$DRY_RUN" = "true" ]; then
        info "Would generate checksums"
        return 0
    fi

    local checksums_file="$BACKUP_DIR/CHECKSUMS"

    find "$BACKUP_DIR" -type f ! -name "CHECKSUMS" ! -name "backup-metadata.json" \
        -exec sha256sum {} \; | sed "s|$BACKUP_DIR/||" > "$checksums_file"

    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local file_count=$(find "$BACKUP_DIR" -type f | wc -l)

    echo "" >> "$checksums_file"
    echo "# Backup Summary" >> "$checksums_file"
    echo "Total Size: $total_size" >> "$checksums_file"
    echo "File Count: $file_count" >> "$checksums_file"
    echo "Generated: $(date -u -Iseconds)" >> "$checksums_file"

    pass "Checksums generated: $file_count files, $total_size"
}

# Upload to S3
upload_to_s3() {
    if [ -z "$S3_BUCKET" ]; then
        return 0
    fi

    if [ "$DRY_RUN" = "true" ]; then
        info "Would upload backup to S3: $S3_BUCKET"
        return 0
    fi

    say "Uploading backup to S3: $S3_BUCKET"

    if command -v aws >/dev/null 2>&1; then
        local archive_file="$BACKUP_BASE/$BACKUP_ID.tar.gz"
        tar -czf "$archive_file" -C "$BACKUP_BASE" "$BACKUP_ID"

        aws s3 cp "$archive_file" "s3://$S3_BUCKET/summit-backups/$BACKUP_ID.tar.gz" \
            --storage-class STANDARD_IA

        aws s3 cp "$BACKUP_DIR/CHECKSUMS" "s3://$S3_BUCKET/summit-backups/$BACKUP_ID.checksums"

        pass "Backup uploaded to S3"
        rm -f "$archive_file"
    else
        warn "AWS CLI not available, skipping S3 upload"
    fi
}

# Main execution based on backup set
main() {
    local start_time=$(date +%s)

    parse_backup_set_config "$BACKUP_SET"
    init_backup

    case "$BACKUP_SET" in
        "full")
            backup_neo4j "full"
            backup_postgres "full"
            backup_timescale
            backup_redis "full"
            backup_config
            backup_secrets
            ;;
        "minimal")
            backup_postgres "core"
            backup_neo4j "core"
            backup_redis "cache"
            ;;
        "tenant")
            if [ -z "$TENANT_ID" ]; then
                fail "TENANT_ID required for tenant backup"
                exit 1
            fi
            backup_neo4j "tenant"
            backup_postgres "tenant"
            backup_config
            ;;
        "project")
            if [ -z "$PROJECT_ID" ]; then
                fail "PROJECT_ID required for project backup"
                exit 1
            fi
            backup_neo4j "project"
            backup_postgres "project"
            ;;
        "config_only")
            backup_config
            backup_secrets
            ;;
        "disaster_recovery")
            backup_neo4j "full"
            backup_postgres "full"
            backup_timescale
            backup_redis "full"
            backup_config
            backup_secrets
            # Additional K8s configs for DR
            if command -v kubectl >/dev/null 2>&1; then
                say "Exporting Kubernetes configurations"
                mkdir -p "$BACKUP_DIR/kubernetes"
                kubectl get configmaps -A -o yaml > "$BACKUP_DIR/kubernetes/configmaps.yaml" 2>/dev/null || warn "Could not export configmaps"
                kubectl get services -A -o yaml > "$BACKUP_DIR/kubernetes/services.yaml" 2>/dev/null || warn "Could not export services"
                kubectl get deployments -A -o yaml > "$BACKUP_DIR/kubernetes/deployments.yaml" 2>/dev/null || warn "Could not export deployments"
                pass "Kubernetes configurations exported"
            fi
            ;;
        *)
            fail "Unknown backup set: $BACKUP_SET"
            exit 1
            ;;
    esac

    generate_checksums
    upload_to_s3

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "unknown")

    say "🎉 Backup Complete: $BACKUP_ID"
    echo "Location: $BACKUP_DIR"
    echo "Size: $size"
    echo "Duration: ${duration}s"

    pass "Backup completed successfully"
}

# Handle command line arguments
case "${1:-}" in
    --help)
        cat << EOF
Usage: $0 [options]

Summit Enhanced Backup Script

Options:
  --set=SET              Backup set: full|minimal|tenant|project|config_only|disaster_recovery
  --tenant-id=ID         Tenant ID (required for tenant backups)
  --project-id=ID        Project ID (required for project backups)
  --dry-run              Simulate backup without executing
  --help                 Show this help

Environment Variables:
  BACKUP_BASE=./backups                   Backup directory
  BACKUP_SET=full                         Backup set to use
  TENANT_ID=tenant123                     Tenant ID for tenant backups
  PROJECT_ID=project456                   Project ID for project backups
  ENCRYPTION_KEY=secret                   Encryption key for secrets
  S3_BUCKET=my-backup-bucket             S3 bucket for remote storage
  DRY_RUN=false                          Dry run mode

Examples:
  # Full backup
  ./scripts/backup-enhanced.sh --set=full

  # Tenant backup
  TENANT_ID=tenant123 ./scripts/backup-enhanced.sh --set=tenant

  # Project backup
  PROJECT_ID=investigation-456 ./scripts/backup-enhanced.sh --set=project

  # DR snapshot with S3 upload
  S3_BUCKET=summit-dr-backups ./scripts/backup-enhanced.sh --set=disaster_recovery

  # Dry run
  ./scripts/backup-enhanced.sh --set=full --dry-run

EOF
        exit 0
        ;;
    --set=*)
        export BACKUP_SET="${1#*=}"
        shift
        main "$@"
        ;;
    --tenant-id=*)
        export TENANT_ID="${1#*=}"
        shift
        main "$@"
        ;;
    --project-id=*)
        export PROJECT_ID="${1#*=}"
        shift
        main "$@"
        ;;
    --dry-run)
        export DRY_RUN=true
        shift
        main "$@"
        ;;
    *)
        main
        ;;
esac
