#!/bin/bash

# Migration Generator Script
# Creates a new migration file with proper naming convention and template

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/db/migrations"

# Default values
MIGRATION_TYPE="schema"
DATABASE_TYPE="postgresql"
DESCRIPTION=""
AUTHOR="${GIT_AUTHOR_EMAIL:-$(git config user.email)}"
BREAKING="false"
DEPENDENCIES=""

# Help function
show_help() {
    cat << EOF
Migration Generator

Usage: $0 [OPTIONS]

Options:
    --type TYPE          Migration type: schema, data, security, perf (default: schema)
    --database DB        Database: postgresql, neo4j, timescale (default: postgresql)
    --description DESC   Brief description (required)
    --author EMAIL       Author email (default: git user.email)
    --breaking           Mark as breaking change (default: false)
    --depends-on IDS     Comma-separated list of migration IDs this depends on
    --help               Show this help message

Examples:
    $0 --type schema --description "add_email_verification"
    $0 --type data --database neo4j --description "backfill_canonical_ids" --depends-on "20251120_150000"
    $0 --type perf --description "add_entity_indexes" --breaking

Migration Types:
    schema   - Schema changes (tables, columns, indexes, constraints)
    data     - Data migrations and backfills
    security - Security and permissions changes
    perf     - Performance optimizations

Database Types:
    postgresql - PostgreSQL migrations (.sql)
    neo4j      - Neo4j migrations (.cypher or .js)
    timescale  - TimescaleDB migrations (.sql)

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            MIGRATION_TYPE="$2"
            shift 2
            ;;
        --database)
            DATABASE_TYPE="$2"
            shift 2
            ;;
        --description)
            DESCRIPTION="$2"
            shift 2
            ;;
        --author)
            AUTHOR="$2"
            shift 2
            ;;
        --breaking)
            BREAKING="true"
            shift
            ;;
        --depends-on)
            DEPENDENCIES="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$DESCRIPTION" ]; then
    echo -e "${YELLOW}Error: Description is required${NC}"
    echo ""
    show_help
    exit 1
fi

# Validate migration type
if [[ ! "$MIGRATION_TYPE" =~ ^(schema|data|security|perf)$ ]]; then
    echo -e "${YELLOW}Error: Invalid migration type. Must be: schema, data, security, or perf${NC}"
    exit 1
fi

# Validate database type
if [[ ! "$DATABASE_TYPE" =~ ^(postgresql|neo4j|timescale)$ ]]; then
    echo -e "${YELLOW}Error: Invalid database type. Must be: postgresql, neo4j, or timescale${NC}"
    exit 1
fi

# Generate migration ID
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_ID="${TIMESTAMP}_${MIGRATION_TYPE}_${DESCRIPTION}"

# Determine file extension
case $DATABASE_TYPE in
    postgresql|timescale)
        FILE_EXT="sql"
        ;;
    neo4j)
        FILE_EXT="cypher"
        ;;
esac

MIGRATION_FILE="$MIGRATIONS_DIR/${MIGRATION_ID}.${FILE_EXT}"

# Create migrations directory if it doesn't exist
mkdir -p "$MIGRATIONS_DIR"

# Determine next version (simple auto-increment for now)
CURRENT_VERSION=$(psql "${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/summit}" -t -c "SELECT get_current_schema_version('$DATABASE_TYPE');" 2>/dev/null | xargs || echo "1.0.0")

# Parse version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Increment version based on breaking change
if [ "$BREAKING" = "true" ]; then
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
else
    MINOR=$((MINOR + 1))
fi

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

# Generate migration file
echo -e "${BLUE}Creating migration: ${MIGRATION_ID}${NC}"
echo -e "${BLUE}Version: ${NEW_VERSION}${NC}"
echo -e "${BLUE}Breaking: ${BREAKING}${NC}"

cat > "$MIGRATION_FILE" << EOF
-- Migration: ${DESCRIPTION}
-- ID: ${MIGRATION_ID}
-- Version: ${NEW_VERSION}
-- Database: ${DATABASE_TYPE}
-- Type: ${MIGRATION_TYPE}
-- Author: ${AUTHOR}
-- Created: $(date +%Y-%m-%d)
-- Breaking: ${BREAKING}
EOF

# Add dependencies if specified
if [ -n "$DEPENDENCIES" ]; then
    echo "-- Dependencies: ${DEPENDENCIES}" >> "$MIGRATION_FILE"
fi

cat >> "$MIGRATION_FILE" << 'EOF'

-- ============================================================================
-- PHASE 1: EXPAND
-- ============================================================================
-- Add new schema elements (tables, columns, indexes)
-- Use CONCURRENTLY for indexes to avoid blocking
-- Use NOT VALID for constraints (validate later)

BEGIN;

-- TODO: Add your EXPAND phase migration here
-- Example:
-- CREATE TABLE new_table (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     ...
-- );
--
-- CREATE INDEX CONCURRENTLY idx_name ON table(column);

COMMIT;

-- ============================================================================
-- PHASE 2: MIGRATE (Optional)
-- ============================================================================
-- Data migration and backfill logic
-- Run in batches for large datasets

-- BEGIN;

-- TODO: Add your MIGRATE phase logic here
-- Example:
-- UPDATE users
-- SET new_column = old_column
-- WHERE new_column IS NULL
-- LIMIT 1000;

-- COMMIT;

-- ============================================================================
-- PHASE 3: CONTRACT (Optional)
-- ============================================================================
-- Remove deprecated schema elements
-- Only run after all application instances are updated

-- BEGIN;

-- TODO: Add your CONTRACT phase logic here
-- Example:
-- DROP INDEX IF EXISTS old_idx;
-- ALTER TABLE users DROP COLUMN IF EXISTS old_column;

-- COMMIT;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- Rollback instructions (reverse all changes)

-- Rollback: [Description of rollback]
/*
BEGIN;

-- TODO: Add rollback logic here
-- Example:
-- DROP TABLE IF EXISTS new_table CASCADE;

COMMIT;
*/

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- Post-migration validation checks

-- TODO: Add validation queries
-- Example:
-- SELECT COUNT(*) FROM new_table; -- Should be > 0
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'new_table'; -- Should be 1

EOF

echo -e "${GREEN}✅ Migration file created: ${MIGRATION_FILE}${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit the migration file and add your changes"
echo "2. Test locally: ./scripts/test-migration.sh ${MIGRATION_ID}.${FILE_EXT}"
echo "3. Commit and create PR: git add ${MIGRATION_FILE} && git commit -m \"feat(db): ${DESCRIPTION}\""
echo ""
echo -e "${YELLOW}Remember:${NC}"
echo "- Use zero-downtime patterns (CONCURRENTLY, NOT VALID)"
echo "- Include rollback steps"
echo "- Add validation queries"
echo "- Test thoroughly before deploying to production"
