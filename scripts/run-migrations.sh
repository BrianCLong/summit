#!/usr/bin/env bash
set -euo pipefail

# Robust migration runner for the Summit golden path
# Runs both PostgreSQL and Neo4j migrations with health checks

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
DATABASE_URL=${DATABASE_URL:-postgresql://${POSTGRES_USER:-summit}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB:-summit_dev}}
MAX_RETRIES=${MIGRATION_MAX_RETRIES:-5}
RETRY_DELAY=${MIGRATION_RETRY_DELAY:-3}

log() {
  printf '[run-migrations] %s\n' "$1"
}

log_error() {
  printf '\033[31m[run-migrations] ERROR: %s\033[0m\n' "$1" >&2
}

log_success() {
  printf '\033[32m[run-migrations] ✓ %s\033[0m\n' "$1"
}

# Wait for PostgreSQL to be ready
wait_for_postgres() {
  log "Waiting for PostgreSQL to be ready..."
  for attempt in $(seq 1 "$MAX_RETRIES"); do
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
      log_success "PostgreSQL is ready"
      return 0
    fi

    if [ "$attempt" -eq "$MAX_RETRIES" ]; then
      log_error "PostgreSQL not ready after $MAX_RETRIES attempts"
      return 1
    fi

    log "Attempt $attempt/$MAX_RETRIES: PostgreSQL not ready, waiting ${RETRY_DELAY}s..."
    sleep "$RETRY_DELAY"
  done
}

# Verify migrations directory exists
verify_migrations_dir() {
  local migrations_dir="$ROOT_DIR/server/db/migrations/postgres"

  if [ ! -d "$migrations_dir" ]; then
    log_error "Migrations directory not found: $migrations_dir"
    return 1
  fi

  local migration_count=$(find "$migrations_dir" -name "*.sql" | wc -l)
  log "Found $migration_count migration files in $migrations_dir"

  if [ "$migration_count" -eq 0 ]; then
    log_error "No migration files found!"
    return 1
  fi

  return 0
}

# Run PostgreSQL migrations
run_postgres_migrations() {
  log "Running PostgreSQL migrations..."

  # Use the existing migrate.js runner
  cd "$ROOT_DIR/server"

  # Check migration status first
  if ! node src/db/migrate.js status; then
    log_error "Failed to check migration status"
    return 1
  fi

  # Run pending migrations
  if ! node src/db/migrate.js up; then
    log_error "Migration execution failed"
    return 1
  fi

  log_success "PostgreSQL migrations completed"
  return 0
}

# Verify critical tables exist
verify_schema() {
  log "Verifying schema tables exist..."

  local required_tables=(
    "schema_migrations"
    "users"
    "entities"
    "relationships"
  )

  for table in "${required_tables[@]}"; do
    if ! psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='$table');" 2>/dev/null | grep -q 't'; then
      log_error "Required table '$table' does not exist"
      return 1
    fi
    log "  ✓ Table '$table' exists"
  done

  log_success "Schema verification passed"
  return 0
}

# Main execution
main() {
  log "Starting database migration process..."
  log "DATABASE_URL: ${DATABASE_URL%%@*}@***" # Hide credentials in logs

  # Step 1: Wait for PostgreSQL
  if ! wait_for_postgres; then
    log_error "PostgreSQL readiness check failed"
    exit 1
  fi

  # Step 2: Verify migrations directory
  if ! verify_migrations_dir; then
    log_error "Migrations directory verification failed"
    exit 1
  fi

  # Step 3: Run migrations
  if ! run_postgres_migrations; then
    log_error "Migration execution failed"
    exit 1
  fi

  # Step 4: Verify schema
  if ! verify_schema; then
    log_error "Schema verification failed"
    exit 1
  fi

  log_success "All migrations completed successfully!"
  log ""
  log "Next steps:"
  log "  - Run 'make smoke' to validate the golden path"
  log "  - Check migration status: cd server && node src/db/migrate.js status"

  exit 0
}

# Allow sourcing for testing
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi
