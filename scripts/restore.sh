#!/usr/bin/env bash
set -euo pipefail

# Conductor BCDR Restore Script
# Restores conductor data from backup

# Configuration
BACKUP_BASE=${BACKUP_BASE:-./backups}
BACKUP_ID=${BACKUP_ID:-}
ENCRYPTION_KEY=${ENCRYPTION_KEY:-}
FORCE=${FORCE:-}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }

# Check requirements
check_requirements() {
    if [ -z "$BACKUP_ID" ]; then
        # Try to find latest backup
        local latest=$(ls -t "$BACKUP_BASE" | grep conductor-backup | head -n1)
        if [ -n "$latest" ]; then
            warn "No BACKUP_ID provided. Using latest: $latest"
            BACKUP_ID="$latest"
        else
            fail "BACKUP_ID not provided and no backups found in $BACKUP_BASE"
            exit 1
        fi
    fi

    BACKUP_DIR="$BACKUP_BASE/$BACKUP_ID"
    if [ ! -d "$BACKUP_DIR" ]; then
        fail "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    if [ -z "$FORCE" ]; then
        warn "This will OVERWRITE existing data. Set FORCE=1 to bypass confirmation."
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Restore Neo4j
restore_neo4j() {
    say "Restoring Neo4j database"
    
    if [ -f "$BACKUP_DIR/neo4j.dump" ]; then
        docker cp "$BACKUP_DIR/neo4j.dump" neo4j:/tmp/neo4j.dump
        
        # Stop database
        docker exec neo4j neo4j stop || true
        
        # Load dump
        docker exec neo4j neo4j-admin database load neo4j --from-path=/tmp --overwrite-destination=true
        
        # Start database
        docker exec neo4j neo4j start
        pass "Neo4j dump restored"
    elif [ -f "$BACKUP_DIR/neo4j-export.cypher" ]; then
        warn "Restoring from Cypher export (slower)"
        cat "$BACKUP_DIR/neo4j-export.cypher" | docker exec -i neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD:-local_dev_pw}"
        pass "Neo4j cypher export restored"
    else
        warn "No Neo4j backup found"
    fi
}

# Restore Postgres
restore_postgres() {
    say "Restoring PostgreSQL database"
    
    local postgres_url="${POSTGRES_URL:-postgres://intelgraph:devpassword@localhost:5432/intelgraph_dev}"
    local db_name="${POSTGRES_DB:-intelgraph_dev}"
    local user="${POSTGRES_USER:-intelgraph}"

    if [ -f "$BACKUP_DIR/postgres.sql" ]; then
        # Check if we can run psql locally
        if command -v psql >/dev/null 2>&1; then
            # Drop and recreate DB (handled by --clean --create in backup usually, but safer to force)
            # Actually, the backup script uses --clean --create, so psql -f should work if connected to 'postgres' db
            # BUT we usually connect to the target DB.
            # If --create is used, we should connect to postgres db.

            # For simplicity, we assume we connect to default postgres db to run the restore script which creates the target db
            PGPASSWORD="${POSTGRES_PASSWORD:-devpassword}" psql -h localhost -U "$user" -d postgres -f "$BACKUP_DIR/postgres.sql"
            pass "PostgreSQL restored (local)"
        else
            # Docker exec
            cat "$BACKUP_DIR/postgres.sql" | docker exec -i postgres psql -U "$user" -d postgres
            pass "PostgreSQL restored (docker)"
        fi
    else
        warn "No PostgreSQL backup found"
    fi
}

# Restore Redis
restore_redis() {
    say "Restoring Redis data"
    
    if [ -f "$BACKUP_DIR/redis.rdb" ]; then
        # Stop Redis
        docker stop redis || true

        # Copy RDB
        # We need to find where volume is mounted or assume default path
        # In docker-compose, redis_data:/data
        # We can use a temporary container to write to the volume if needed, or docker cp if container is running (but redis overwrites on shutdown)

        # Strategy: Start redis with appendonly no, copy file, restart?
        # Better: Overwrite file in volume.

        # If we use docker cp, we need container running?
        # Actually, if we stopped it, we can't cp.
        # So start it, cp file, restart? Redis loads RDB on startup.

        docker start redis
        docker cp "$BACKUP_DIR/redis.rdb" redis:/data/dump.rdb
        docker restart redis

        pass "Redis RDB restored"
    else
        warn "No Redis backup found"
    fi
}

# Restore Config/Secrets
restore_config() {
    say "Restoring Config/Secrets"
    
    if [ -f "$BACKUP_DIR/secrets.enc" ] && [ -n "$ENCRYPTION_KEY" ]; then
        if command -v gpg >/dev/null 2>&1; then
            gpg --decrypt --passphrase "$ENCRYPTION_KEY" --batch --yes \
                --output "$BACKUP_DIR/secrets.restored" "$BACKUP_DIR/secrets.enc"
        else
             openssl enc -d -aes-256-cbc -in "$BACKUP_DIR/secrets.enc" -out "$BACKUP_DIR/secrets.restored" \
                -pass "pass:$ENCRYPTION_KEY"
        fi
        
        if [ -f "$BACKUP_DIR/secrets.restored" ]; then
            pass "Secrets decrypted to $BACKUP_DIR/secrets.restored"
        else
            fail "Failed to decrypt secrets"
        fi
    fi
    
    # We generally don't overwrite config files automatically in restore to avoid breaking current env,
    # but we can list them.
    if [ -d "$BACKUP_DIR/config" ]; then
        warn "Config files are available in $BACKUP_DIR/config. Manual restoration recommended."
    fi
}

# Main
main() {
    check_requirements
    
    say "Starting Restore from $BACKUP_ID"
    
    restore_neo4j
    restore_postgres
    restore_redis
    restore_config
    
    say "🎉 Restore Complete"
}

main
