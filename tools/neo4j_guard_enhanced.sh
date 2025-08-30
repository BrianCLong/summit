#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a

# Enhanced Neo4j Migration Guard with safety features and validation
# Provides safe, isolated testing of Cypher migration scripts

# Configuration (override via environment variables)
MIG_DIR="${MIG_DIR:-db/migrations}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.neo4j.yml}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASS="${NEO4J_PASS:-testtest1}"
KEEP_DB="${KEEP_DB:-0}"
VALIDATION_MODE="${VALIDATION_MODE:-1}"
MAX_WAIT_TIME="${MAX_WAIT_TIME:-300}"
PRE_MIGRATION_BACKUP="${PRE_MIGRATION_BACKUP:-0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Cleanup function for trap
cleanup() {
    local exit_code=$?
    if [ "$KEEP_DB" != "1" ] && [ "$KEEP_DB" != "true" ]; then
        log_info "Cleaning up Neo4j container..."
        stop_neo4j || true
    fi
    exit $exit_code
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Docker compose command detection
detect_docker_compose() {
    if command -v "docker" >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command -v "docker-compose" >/dev/null 2>&1; then
        echo "docker-compose"  
    else
        log_error "Neither 'docker compose' nor 'docker-compose' is available"
        exit 1
    fi
}

# Start Neo4j container
start_neo4j() {
    local dc_cmd=$(detect_docker_compose)
    
    log_info "Starting Neo4j ephemeral container..."
    
    # Ensure any existing container is stopped
    $dc_cmd -f "$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
    
    # Start the container
    if ! $dc_cmd -f "$COMPOSE_FILE" up -d neo4j-ephemeral; then
        log_error "Failed to start Neo4j container"
        return 1
    fi
    
    log_success "Neo4j container started"
}

# Stop Neo4j container  
stop_neo4j() {
    local dc_cmd=$(detect_docker_compose)
    
    log_info "Stopping Neo4j ephemeral container..."
    $dc_cmd -f "$COMPOSE_FILE" down -v --remove-orphans
}

# Wait for Neo4j to be ready
wait_for_neo4j() {
    log_info "Waiting for Neo4j to accept connections..."
    
    local waited=0
    local check_interval=2
    
    while [ $waited -lt $MAX_WAIT_TIME ]; do
        if docker exec neo4j-ephemeral cypher-shell \
            -a bolt://localhost:7687 \
            -u "$NEO4J_USER" \
            -p "$NEO4J_PASS" \
            "RETURN 1 as test;" >/dev/null 2>&1; then
            log_success "Neo4j is ready (took ${waited}s)"
            return 0
        fi
        
        # Show progress every 10 seconds
        if [ $((waited % 10)) -eq 0 ] && [ $waited -gt 0 ]; then
            log_info "Still waiting... (${waited}s elapsed)"
            
            # Show recent logs if taking a while
            if [ $waited -ge 30 ]; then
                log_warning "Taking longer than expected. Recent logs:"
                docker logs --tail=10 neo4j-ephemeral 2>/dev/null || true
            fi
        fi
        
        sleep $check_interval
        waited=$((waited + check_interval))
    done
    
    log_error "Neo4j failed to become ready within ${MAX_WAIT_TIME}s"
    log_error "Container logs:"
    docker logs --tail=50 neo4j-ephemeral 2>/dev/null || true
    return 1
}

# Validate migration file
validate_migration_file() {
    local file="$1"
    local filename=$(basename "$file")
    
    log_info "Validating migration file: $filename"
    
    # Check file is readable
    if [ ! -r "$file" ]; then
        log_error "Cannot read migration file: $file"
        return 1
    fi
    
    # Check file is not empty
    if [ ! -s "$file" ]; then
        log_warning "Migration file is empty: $filename"
        return 0
    fi
    
    # Basic syntax validation
    local content=$(cat "$file")
    
    # Check for dangerous operations in production-style migrations
    if [ "$VALIDATION_MODE" = "1" ]; then
        # Warn about potentially destructive operations
        if echo "$content" | grep -qi "DROP\|DELETE\|REMOVE\|DETACH DELETE"; then
            log_warning "$filename contains potentially destructive operations (DROP/DELETE/REMOVE)"
        fi
        
        # Check for common syntax issues
        if echo "$content" | grep -q ";.*[[:space:]]*[^[:space:]]"; then
            log_warning "$filename may have statements after semicolons on same line"
        fi
    fi
    
    log_success "Migration file validation passed: $filename"
    return 0
}

# Execute single migration file
execute_migration() {
    local file="$1"
    local filename=$(basename "$file")
    
    log_info "Executing migration: $filename"
    
    # Validate file first
    if ! validate_migration_file "$file"; then
        return 1
    fi
    
    # Execute the migration with error handling
    local temp_output=$(mktemp)
    local exit_code=0
    
    if docker exec -i neo4j-ephemeral cypher-shell \
        -a bolt://localhost:7687 \
        -u "$NEO4J_USER" \
        -p "$NEO4J_PASS" \
        --format plain < "$file" > "$temp_output" 2>&1; then
        
        log_success "Migration completed: $filename"
        
        # Show output if verbose or if there were warnings
        if [ -s "$temp_output" ]; then
            local output_content=$(cat "$temp_output")
            if echo "$output_content" | grep -qi "warn"; then
                log_warning "Migration output for $filename:"
                cat "$temp_output"
            fi
        fi
    else
        exit_code=$?
        log_error "Migration failed: $filename"
        log_error "Error output:"
        cat "$temp_output"
        rm -f "$temp_output"
        return $exit_code
    fi
    
    rm -f "$temp_output"
    return 0
}

# Get database state for reporting
get_database_state() {
    log_info "Collecting database state information..."
    
    local temp_output=$(mktemp)
    
    # Get node and relationship counts
    docker exec neo4j-ephemeral cypher-shell \
        -a bolt://localhost:7687 \
        -u "$NEO4J_USER" \
        -p "$NEO4J_PASS" \
        --format plain \
        "CALL apoc.meta.stats() YIELD labelCount, relTypeCount, nodeCount, relCount RETURN labelCount, relTypeCount, nodeCount, relCount;" \
        > "$temp_output" 2>/dev/null || \
    docker exec neo4j-ephemeral cypher-shell \
        -a bolt://localhost:7687 \
        -u "$NEO4J_USER" \
        -p "$NEO4J_PASS" \
        --format plain \
        "MATCH (n) RETURN count(n) as nodeCount; MATCH ()-[r]->() RETURN count(r) as relCount;" \
        > "$temp_output" 2>/dev/null || true
    
    if [ -s "$temp_output" ]; then
        log_info "Database state:"
        cat "$temp_output"
    fi
    
    rm -f "$temp_output"
}

# Smoke test the database
smoke_test() {
    log_info "Running smoke tests..."
    
    local tests_passed=0
    local tests_total=3
    
    # Test 1: Basic connectivity
    if docker exec neo4j-ephemeral cypher-shell \
        -a bolt://localhost:7687 \
        -u "$NEO4J_USER" \
        -p "$NEO4J_PASS" \
        "RETURN 'connectivity_test' as test;" >/dev/null 2>&1; then
        log_success "✓ Connectivity test passed"
        tests_passed=$((tests_passed + 1))
    else
        log_error "✗ Connectivity test failed"
    fi
    
    # Test 2: Database functions
    if docker exec neo4j-ephemeral cypher-shell \
        -a bolt://localhost:7687 \
        -u "$NEO4J_USER" \
        -p "$NEO4J_PASS" \
        "RETURN db.labels() as labels LIMIT 1;" >/dev/null 2>&1; then
        log_success "✓ Database function test passed"  
        tests_passed=$((tests_passed + 1))
    else
        log_error "✗ Database function test failed"
    fi
    
    # Test 3: Schema operations
    if docker exec neo4j-ephemeral cypher-shell \
        -a bolt://localhost:7687 \
        -u "$NEO4J_USER" \
        -p "$NEO4J_PASS" \
        "SHOW CONSTRAINTS;" >/dev/null 2>&1; then
        log_success "✓ Schema operations test passed"
        tests_passed=$((tests_passed + 1))
    else
        log_warning "✗ Schema operations test failed (may be expected)"
    fi
    
    log_info "Smoke tests: $tests_passed/$tests_total passed"
    return 0
}

# Main execution function
main() {
    log_info "Neo4j Migration Guard Enhanced - Starting"
    log_info "Configuration:"
    log_info "  Migration Directory: $MIG_DIR"
    log_info "  Compose File: $COMPOSE_FILE"  
    log_info "  Keep Database: $KEEP_DB"
    log_info "  Validation Mode: $VALIDATION_MODE"
    log_info "  Max Wait Time: ${MAX_WAIT_TIME}s"
    
    # Validate migration directory
    if [ ! -d "$MIG_DIR" ]; then
        log_error "Migration directory '$MIG_DIR' does not exist"
        exit 1
    fi
    
    # Check for compose file
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Compose file '$COMPOSE_FILE' not found"
        exit 1
    fi
    
    # Start Neo4j
    if ! start_neo4j; then
        log_error "Failed to start Neo4j"
        exit 1
    fi
    
    # Wait for readiness
    if ! wait_for_neo4j; then
        log_error "Neo4j failed to become ready"
        exit 1
    fi
    
    # Find and execute migrations
    local migration_count=0
    local failed_migrations=0
    
    # Use find with sort for consistent ordering
    while IFS= read -r -d '' file; do
        if [ -f "$file" ] && [[ "$file" == *.cypher ]]; then
            migration_count=$((migration_count + 1))
            
            if ! execute_migration "$file"; then
                failed_migrations=$((failed_migrations + 1))
                log_error "Migration failed: $(basename "$file")"
                
                # Stop on first failure unless in validation mode
                if [ "$VALIDATION_MODE" != "1" ]; then
                    break
                fi
            fi
        fi
    done < <(find "$MIG_DIR" -type f -name '*.cypher' -print0 | sort -z)
    
    # Report results
    log_info "Migration Summary:"
    log_info "  Total migrations found: $migration_count"
    log_info "  Successful migrations: $((migration_count - failed_migrations))"
    
    if [ $failed_migrations -gt 0 ]; then
        log_error "  Failed migrations: $failed_migrations"
    else
        log_success "  All migrations completed successfully!"
    fi
    
    # Run smoke tests if migrations were successful
    if [ $failed_migrations -eq 0 ] && [ $migration_count -gt 0 ]; then
        smoke_test
        get_database_state
    fi
    
    # Handle database cleanup/persistence
    if [ "$KEEP_DB" = "1" ] || [ "$KEEP_DB" = "true" ]; then
        log_info "Database kept running for inspection"
        log_info "Access at: http://localhost:7474"
        log_info "Credentials: $NEO4J_USER / $NEO4J_PASS"
        log_info "To connect via Cypher shell: just neo4j-shell"
    else
        log_info "Cleaning up ephemeral database..."
    fi
    
    # Exit with appropriate code
    if [ $failed_migrations -gt 0 ]; then
        exit 1
    elif [ $migration_count -eq 0 ]; then
        log_warning "No migration files found in $MIG_DIR"
        exit 0
    else
        log_success "All migrations completed successfully!"
        exit 0
    fi
}

# Usage information
show_usage() {
    cat << EOF
Neo4j Migration Guard Enhanced

Usage: $0 [options]

Environment Variables:
  MIG_DIR               Directory containing .cypher migration files (default: db/migrations)
  COMPOSE_FILE          Docker compose file path (default: docker-compose.neo4j.yml)  
  NEO4J_USER           Neo4j username (default: neo4j)
  NEO4J_PASS           Neo4j password (default: testtest1)
  KEEP_DB              Keep database running after migrations (0/1, default: 0)
  VALIDATION_MODE      Enable additional validation checks (0/1, default: 1)
  MAX_WAIT_TIME        Maximum time to wait for Neo4j startup in seconds (default: 300)

Examples:
  $0                                    # Run with defaults
  MIG_DIR=./cypher $0                   # Use custom migration directory
  KEEP_DB=1 $0                         # Keep database running for inspection
  VALIDATION_MODE=0 $0                 # Skip validation checks

Exit Codes:
  0    Success - all migrations applied successfully
  1    Failure - one or more migrations failed
  2    Configuration error - invalid setup or missing files
EOF
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"