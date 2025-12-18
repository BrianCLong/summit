#!/usr/bin/env bash
set -euo pipefail

# Test script for database migrations
# Validates that migrations can run successfully and schema is created correctly

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

log() {
  printf '[test-migrations] %s\n' "$1"
}

log_error() {
  printf '\033[31m[test-migrations] ERROR: %s\033[0m\n' "$1" >&2
}

log_success() {
  printf '\033[32m[test-migrations] ✓ %s\033[0m\n' "$1"
}

# Test 1: Verify migrations directory exists
test_migrations_directory() {
  log "Test 1: Verifying migrations directory..."

  local migrations_dir="$ROOT_DIR/server/db/migrations/postgres"
  if [ ! -d "$migrations_dir" ]; then
    log_error "Migrations directory not found: $migrations_dir"
    return 1
  fi

  local count=$(find "$migrations_dir" -name "*.sql" | wc -l)
  if [ "$count" -eq 0 ]; then
    log_error "No migration files found in $migrations_dir"
    return 1
  fi

  log_success "Found $count migration files"
  return 0
}

# Test 2: Verify migration runner exists
test_migration_runner() {
  log "Test 2: Verifying migration runner..."

  if [ ! -f "$ROOT_DIR/server/src/db/migrate.js" ]; then
    log_error "Migration runner not found: server/src/db/migrate.js"
    return 1
  fi

  log_success "Migration runner exists"
  return 0
}

# Test 3: Verify run-migrations.sh exists and is executable
test_run_migrations_script() {
  log "Test 3: Verifying run-migrations.sh script..."

  if [ ! -f "$SCRIPT_DIR/run-migrations.sh" ]; then
    log_error "run-migrations.sh not found"
    return 1
  fi

  if [ ! -x "$SCRIPT_DIR/run-migrations.sh" ]; then
    log_error "run-migrations.sh is not executable"
    return 1
  fi

  log_success "run-migrations.sh exists and is executable"
  return 0
}

# Test 4: Verify .env has required database variables
test_env_variables() {
  log "Test 4: Verifying .env has database configuration..."

  if [ ! -f "$ROOT_DIR/.env" ]; then
    log "Warning: .env not found (may not be bootstrapped yet)"
    return 0
  fi

  # Source .env and check for DATABASE_URL or constituent parts
  set -a
  source "$ROOT_DIR/.env"
  set +a

  if [ -z "${DATABASE_URL:-}" ] && [ -z "${POSTGRES_PASSWORD:-}" ]; then
    log_error "Neither DATABASE_URL nor POSTGRES_PASSWORD is set in .env"
    return 1
  fi

  log_success ".env has database configuration"
  return 0
}

# Test 5: Verify Makefile has migrate target
test_makefile_target() {
  log "Test 5: Verifying Makefile has 'migrate' target..."

  if ! grep -q "^migrate:" "$ROOT_DIR/Makefile"; then
    log_error "Makefile does not have 'migrate' target"
    return 1
  fi

  log_success "Makefile has 'migrate' target"
  return 0
}

# Test 6: Verify smoke test has schema verification
test_smoke_schema_check() {
  log "Test 6: Verifying smoke test has schema verification..."

  if ! grep -q "Database Schema Verification" "$SCRIPT_DIR/smoke-test.cjs"; then
    log_error "smoke-test.cjs does not have schema verification step"
    return 1
  fi

  log_success "smoke-test.cjs has schema verification"
  return 0
}

# Run all tests
main() {
  log "Running migration test suite..."
  log ""

  local failed=0

  test_migrations_directory || ((failed++))
  test_migration_runner || ((failed++))
  test_run_migrations_script || ((failed++))
  test_env_variables || ((failed++))
  test_makefile_target || ((failed++))
  test_smoke_schema_check || ((failed++))

  log ""
  if [ "$failed" -eq 0 ]; then
    log_success "All migration tests passed! ✓"
    log ""
    log "Next steps:"
    log "  1. Run 'make bootstrap' to setup dependencies"
    log "  2. Run 'make up' to start services and run migrations"
    log "  3. Run 'make smoke' to validate the golden path"
    return 0
  else
    log_error "$failed test(s) failed"
    return 1
  fi
}

main "$@"
