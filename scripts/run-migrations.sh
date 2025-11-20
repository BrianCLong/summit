#!/bin/bash

# ============================================================================
# Summit Governance Migration Runner
# ============================================================================
# This script runs all database migrations for the governance system
#
# Usage:
#   ./scripts/run-migrations.sh [OPTIONS]
#
# Options:
#   --postgres-only    Run only PostgreSQL migrations
#   --neo4j-only       Run only Neo4j migrations
#   --verify           Verify migrations without running
#   --rollback         Rollback migrations (dangerous!)
#   --help             Show this help message
#
# Examples:
#   ./scripts/run-migrations.sh                  # Run all migrations
#   ./scripts/run-migrations.sh --postgres-only   # PostgreSQL only
#   ./scripts/run-migrations.sh --verify          # Dry run
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/server/src/migrations"

# Default options
RUN_POSTGRES=true
RUN_NEO4J=true
VERIFY_ONLY=false
ROLLBACK=false

# ============================================================================
# Helper Functions
# ============================================================================

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

show_help() {
    head -n 20 "$0" | tail -n 18
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed or not in PATH"
        exit 1
    fi
}

# ============================================================================
# PostgreSQL Migrations
# ============================================================================

run_postgres_migrations() {
    log_info "Running PostgreSQL migrations..."

    # Check if psql is available
    check_command psql

    # Check database connection
    if ! psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
        log_error "Cannot connect to PostgreSQL database"
        log_info "DATABASE_URL: ${DATABASE_URL:-not set}"
        exit 1
    fi

    log_success "Connected to PostgreSQL"

    # Run governance schema migration
    log_info "Running 001_governance_schema.sql..."

    if [ "$VERIFY_ONLY" = true ]; then
        log_info "Verification mode - showing migration SQL:"
        cat "$MIGRATIONS_DIR/001_governance_schema.sql" | head -n 50
        log_info "... (truncated for brevity)"
    else
        psql "$DATABASE_URL" -f "$MIGRATIONS_DIR/001_governance_schema.sql"
        log_success "PostgreSQL migration completed"
    fi

    # Verify tables created
    log_info "Verifying tables..."
    TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('warrants', 'warrant_usage', 'access_purposes', 'access_requests', 'audit_events')")

    if [ "$TABLES" -ge 5 ]; then
        log_success "All required tables exist"
    else
        log_warning "Some tables may be missing (found: $TABLES, expected: >= 5)"
    fi

    # Show table summary
    log_info "Table summary:"
    psql "$DATABASE_URL" -c "\dt" | grep -E "(warrants|access_|audit_|policy_|retention)" || true
}

rollback_postgres_migrations() {
    log_warning "Rolling back PostgreSQL migrations..."

    if [ "$VERIFY_ONLY" = false ]; then
        read -p "Are you sure you want to drop all governance tables? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "Rollback cancelled"
            return
        fi
    fi

    log_info "Dropping tables..."
    psql "$DATABASE_URL" << 'EOSQL'
DROP TABLE IF EXISTS warrant_usage CASCADE;
DROP TABLE IF EXISTS warrants CASCADE;
DROP TABLE IF EXISTS access_requests CASCADE;
DROP TABLE IF EXISTS access_purposes CASCADE;
DROP TABLE IF EXISTS policy_tag_metadata CASCADE;
DROP TABLE IF EXISTS data_retention_policies CASCADE;
DROP TABLE IF EXISTS compliance_reports CASCADE;
DROP TABLE IF EXISTS forensic_analyses CASCADE;
DROP VIEW IF EXISTS active_warrants_v CASCADE;
DROP VIEW IF EXISTS pending_access_requests_v CASCADE;
EOSQL

    log_success "PostgreSQL rollback completed"
}

# ============================================================================
# Neo4j Migrations
# ============================================================================

run_neo4j_migrations() {
    log_info "Running Neo4j migrations..."

    # Check if cypher-shell is available
    if ! command -v cypher-shell &> /dev/null; then
        log_warning "cypher-shell not found, trying to use Neo4j driver..."
        run_neo4j_migrations_via_driver
        return
    fi

    # Extract Neo4j credentials
    NEO4J_HOST=$(echo "$NEO4J_URI" | sed -E 's|bolt://([^:]+):.*|\1|')
    NEO4J_PORT=$(echo "$NEO4J_URI" | sed -E 's|.*:([0-9]+)|\1|')

    log_info "Connecting to Neo4j at $NEO4J_HOST:$NEO4J_PORT..."

    # Check connection
    if ! cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" "RETURN 1" &> /dev/null; then
        log_error "Cannot connect to Neo4j database"
        log_info "NEO4J_URI: ${NEO4J_URI:-not set}"
        exit 1
    fi

    log_success "Connected to Neo4j"

    if [ "$VERIFY_ONLY" = true ]; then
        log_info "Verification mode - checking existing policy tags..."
        cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" \
            "MATCH (n) WHERE EXISTS(n.policy_sensitivity) RETURN count(n) as nodes_with_tags"
    else
        log_info "Adding policy tags to all nodes..."

        # This would ideally run the TypeScript migration, but for bash we'll do a simplified version
        cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" << 'EOCYPHER'
// Add default policy tags to nodes
MATCH (n)
WHERE NOT EXISTS(n.policy_sensitivity)
SET n.policy_origin = 'existing_data',
    n.policy_sensitivity = 'internal',
    n.policy_legal_basis = ['legitimate_interest'],
    n.policy_purpose = ['investigation', 'threat_intel'],
    n.policy_data_classification = 'general',
    n.policy_retention_days = 2555,
    n.policy_collection_date = datetime(),
    n.policy_jurisdiction = 'US',
    n.policy_access_count = 0,
    n.policy_pii_flags = {
        has_names: false,
        has_emails: false,
        has_phones: false,
        has_ssn: false,
        has_addresses: false,
        has_biometric: false
    };

// Add policy tags to relationships
MATCH ()-[r]->()
WHERE NOT EXISTS(r.policy_sensitivity)
SET r.policy_sensitivity = 'internal',
    r.policy_legal_basis = ['legitimate_interest'],
    r.policy_confidence = 0.5,
    r.policy_provenance = 'existing_data';
EOCYPHER

        log_success "Neo4j policy tags added"

        log_info "Creating indexes..."
        cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" << 'EOCYPHER'
CREATE INDEX entity_policy_sensitivity IF NOT EXISTS FOR (n:Entity) ON (n.policy_sensitivity);
CREATE INDEX entity_policy_legal_basis IF NOT EXISTS FOR (n:Entity) ON (n.policy_legal_basis);
CREATE INDEX entity_policy_purpose IF NOT EXISTS FOR (n:Entity) ON (n.policy_purpose);
EOCYPHER

        log_success "Neo4j indexes created"
    fi

    # Verify migration
    log_info "Verifying migration..."
    cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" \
        "MATCH (n) RETURN count(n) as total_nodes, count(CASE WHEN EXISTS(n.policy_sensitivity) THEN 1 END) as tagged_nodes"
}

run_neo4j_migrations_via_driver() {
    log_info "Running Neo4j migrations via Node.js driver..."

    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "package.json not found. Are you in the right directory?"
        exit 1
    fi

    cd "$PROJECT_ROOT"

    if [ "$VERIFY_ONLY" = false ]; then
        npm run migrate:neo4j || {
            log_error "Neo4j migration failed"
            log_info "Make sure you have a 'migrate:neo4j' script in package.json"
            exit 1
        }
    fi
}

rollback_neo4j_migrations() {
    log_warning "Rolling back Neo4j migrations..."

    if [ "$VERIFY_ONLY" = false ]; then
        read -p "Are you sure you want to remove all policy tags? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "Rollback cancelled"
            return
        fi
    fi

    log_info "Removing policy tags..."
    cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" << 'EOCYPHER'
MATCH (n) WHERE EXISTS(n.policy_sensitivity)
REMOVE n.policy_origin, n.policy_sensitivity, n.policy_legal_basis,
       n.policy_purpose, n.policy_data_classification, n.policy_retention_days,
       n.policy_collection_date, n.policy_expiry_date, n.policy_jurisdiction,
       n.policy_access_count, n.policy_pii_flags, n.policy_owner,
       n.policy_source_warrant, n.policy_last_accessed;

MATCH ()-[r]->() WHERE EXISTS(r.policy_sensitivity)
REMOVE r.policy_sensitivity, r.policy_legal_basis, r.policy_confidence,
       r.policy_provenance, r.policy_source_warrant;
EOCYPHER

    log_success "Neo4j rollback completed"
}

# ============================================================================
# Main Script
# ============================================================================

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --postgres-only)
            RUN_POSTGRES=true
            RUN_NEO4J=false
            shift
            ;;
        --neo4j-only)
            RUN_POSTGRES=false
            RUN_NEO4J=true
            shift
            ;;
        --verify)
            VERIFY_ONLY=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    log_info "Loading environment from .env file..."
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
else
    log_warning ".env file not found. Using environment variables."
fi

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL not set"
    log_info "Please set DATABASE_URL in .env or environment"
    exit 1
fi

if [ -z "$NEO4J_URI" ] || [ -z "$NEO4J_USER" ] || [ -z "$NEO4J_PASSWORD" ]; then
    if [ "$RUN_NEO4J" = true ]; then
        log_error "Neo4j credentials not set"
        log_info "Please set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env or environment"
        exit 1
    fi
fi

# Show configuration
log_info "Migration Configuration:"
echo "  PostgreSQL: $([ "$RUN_POSTGRES" = true ] && echo "✓" || echo "✗")"
echo "  Neo4j:      $([ "$RUN_NEO4J" = true ] && echo "✓" || echo "✗")"
echo "  Mode:       $([ "$VERIFY_ONLY" = true ] && echo "Verify Only" || echo "Execute")"
echo "  Action:     $([ "$ROLLBACK" = true ] && echo "Rollback" || echo "Migrate")"
echo ""

# Confirmation for rollback
if [ "$ROLLBACK" = true ] && [ "$VERIFY_ONLY" = false ]; then
    log_warning "ROLLBACK MODE: This will delete all governance data!"
    read -p "Type 'ROLLBACK' to confirm: " confirm
    if [ "$confirm" != "ROLLBACK" ]; then
        log_info "Rollback cancelled"
        exit 0
    fi
fi

# Run migrations
if [ "$ROLLBACK" = true ]; then
    [ "$RUN_POSTGRES" = true ] && rollback_postgres_migrations
    [ "$RUN_NEO4J" = true ] && rollback_neo4j_migrations
else
    [ "$RUN_POSTGRES" = true ] && run_postgres_migrations
    [ "$RUN_NEO4J" = true ] && run_neo4j_migrations
fi

# Summary
echo ""
log_success "Migration process completed!"
echo ""
log_info "Next steps:"
echo "  1. Verify migrations: ./scripts/run-migrations.sh --verify"
echo "  2. Start application: npm run dev"
echo "  3. Run tests: npm test -- governance-acceptance.test.ts"
echo ""
