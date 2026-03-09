#!/bin/bash

# Maestro Conductor v24.4.0 - Ledger Signing Script
# Epic E18: Provenance Integrity & Crypto Evidence - Daily root signing with cosign

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/maestro/ledger-signing.log"
BACKUP_DIR="/var/backup/maestro/ledger-roots"
COSIGN_KEY="${COSIGN_KEY:-/etc/maestro/keys/cosign.key}"
COSIGN_PASSWORD="${COSIGN_PASSWORD:-}"

# Database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-maestro}"
DB_USER="${DB_USER:-maestro}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Options
TENANT_ID=""
DRY_RUN=false
VERBOSE=false
FORCE_SIGN=false

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Sign provenance ledger roots with cosign

OPTIONS:
    -t, --tenant-id TENANT_ID    Sign roots for specific tenant only
    --dry-run                    Show what would be signed without executing
    --force                      Force signing even if recent roots exist
    -v, --verbose                Enable verbose logging
    -h, --help                   Show this help message

EXAMPLES:
    # Sign all tenant roots
    $0

    # Sign specific tenant
    $0 --tenant-id tenant_123

    # Dry run to see what would be signed
    $0 --dry-run --verbose

ENVIRONMENT VARIABLES:
    COSIGN_KEY          Path to cosign private key (default: /etc/maestro/keys/cosign.key)
    COSIGN_PASSWORD     Password for cosign key (if encrypted)
    DB_HOST            Database host (default: localhost)
    DB_PORT            Database port (default: 5432)
    DB_NAME            Database name (default: maestro)
    DB_USER            Database user (default: maestro)
    DB_PASSWORD        Database password
EOF
}

log() {
    local level="$1"
    shift
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local message="[$timestamp] [$level] $*"
    
    echo "$message" | tee -a "$LOG_FILE"
    
    if [ "$level" = "ERROR" ]; then
        echo "$message" >&2
    fi
}

verbose_log() {
    if [ "$VERBOSE" = true ]; then
        log "DEBUG" "$@"
    fi
}

check_prerequisites() {
    verbose_log "Checking prerequisites..."
    
    # Check required tools
    command -v cosign >/dev/null 2>&1 || {
        log "ERROR" "cosign not found. Please install cosign."
        exit 1
    }
    
    command -v psql >/dev/null 2>&1 || {
        log "ERROR" "psql not found. Please install PostgreSQL client."
        exit 1
    }
    
    command -v jq >/dev/null 2>&1 || {
        log "ERROR" "jq not found. Please install jq."
        exit 1
    }
    
    # Check cosign key
    if [ ! -f "$COSIGN_KEY" ]; then
        log "ERROR" "Cosign key not found at $COSIGN_KEY"
        exit 1
    fi
    
    # Create directories
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$BACKUP_DIR"
    
    # Test database connection
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log "ERROR" "Cannot connect to database"
        exit 1
    fi
    
    verbose_log "Prerequisites check passed"
}

get_tenants_to_sign() {
    local tenant_filter=""
    if [ -n "$TENANT_ID" ]; then
        tenant_filter="AND tenant_id = '$TENANT_ID'"
    fi
    
    local query="
        SELECT DISTINCT tenant_id
        FROM provenance_ledger_v2 
        WHERE NOT EXISTS (
            SELECT 1 FROM provenance_ledger_roots r
            WHERE r.tenant_id = provenance_ledger_v2.tenant_id
            AND r.timestamp > NOW() - INTERVAL '1 day'
        )
        $tenant_filter
        ORDER BY tenant_id;
    "
    
    if [ "$FORCE_SIGN" = true ]; then
        # Force signing by ignoring recent roots check
        query="
            SELECT DISTINCT tenant_id
            FROM provenance_ledger_v2
            $tenant_filter
            ORDER BY tenant_id;
        "
    fi
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "$query" | sed 's/^[ \t]*//' | grep -v '^$'
}

get_unsigned_entries() {
    local tenant_id="$1"
    
    local query="
        SELECT 
            MIN(sequence_number) as start_seq,
            MAX(sequence_number) as end_seq,
            COUNT(*) as entry_count,
            string_agg(current_hash, ',' ORDER BY sequence_number) as hashes
        FROM provenance_ledger_v2 
        WHERE tenant_id = '$tenant_id'
        AND NOT EXISTS (
            SELECT 1 FROM provenance_ledger_roots 
            WHERE tenant_id = '$tenant_id' 
            AND end_sequence >= provenance_ledger_v2.sequence_number
        );
    "
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "$query" | sed 's/^[ \t]*//' | head -n1
}

compute_merkle_root() {
    local hashes="$1"
    
    # Convert comma-separated hashes to array
    IFS=',' read -ra hash_array <<< "$hashes"
    
    if [ ${#hash_array[@]} -eq 0 ]; then
        echo "0000000000000000000000000000000000000000000000000000000000000000"
        return
    fi
    
    if [ ${#hash_array[@]} -eq 1 ]; then
        echo "${hash_array[0]}"
        return
    fi
    
    # Build Merkle tree
    local current_level=("${hash_array[@]}")
    
    while [ ${#current_level[@]} -gt 1 ]; do
        local next_level=()
        
        for ((i=0; i<${#current_level[@]}; i+=2)); do
            local left="${current_level[i]}"
            local right="${current_level[i+1]:-$left}"  # Use left if odd number
            local combined=$(echo -n "${left}${right}" | sha256sum | cut -d' ' -f1)
            next_level+=("$combined")
        done
        
        current_level=("${next_level[@]}")
    done
    
    echo "${current_level[0]}"
}

sign_root() {
    local root_hash="$1"
    local temp_file="$2"
    
    echo -n "$root_hash" > "$temp_file"
    
    if [ -n "$COSIGN_PASSWORD" ]; then
        echo "$COSIGN_PASSWORD" | cosign sign-blob \
            --key "$COSIGN_KEY" \
            --output-signature "${temp_file}.sig" \
            --output-certificate "${temp_file}.crt" \
            "$temp_file" 2>/dev/null || {
            log "ERROR" "Failed to sign root hash with cosign"
            return 1
        }
    else
        cosign sign-blob \
            --key "$COSIGN_KEY" \
            --output-signature "${temp_file}.sig" \
            --output-certificate "${temp_file}.crt" \
            "$temp_file" 2>/dev/null || {
            log "ERROR" "Failed to sign root hash with cosign"
            return 1
        }
    fi
    
    # Return signature
    cat "${temp_file}.sig"
}

create_signed_root() {
    local tenant_id="$1"
    
    log "INFO" "Processing tenant: $tenant_id"
    
    # Get unsigned entries
    local entry_info=$(get_unsigned_entries "$tenant_id")
    
    if [ -z "$entry_info" ] || [ "$entry_info" = " | | | " ]; then
        verbose_log "No unsigned entries found for tenant $tenant_id"
        return 0
    fi
    
    # Parse entry information
    local start_seq=$(echo "$entry_info" | cut -d'|' -f1 | sed 's/^[ \t]*//' | sed 's/[ \t]*$//')
    local end_seq=$(echo "$entry_info" | cut -d'|' -f2 | sed 's/^[ \t]*//' | sed 's/[ \t]*$//')
    local entry_count=$(echo "$entry_info" | cut -d'|' -f3 | sed 's/^[ \t]*//' | sed 's/[ \t]*$//')
    local hashes=$(echo "$entry_info" | cut -d'|' -f4 | sed 's/^[ \t]*//' | sed 's/[ \t]*$//')
    
    if [ -z "$start_seq" ] || [ "$start_seq" = "" ]; then
        verbose_log "No entries to sign for tenant $tenant_id"
        return 0
    fi
    
    verbose_log "Found $entry_count entries (sequence $start_seq to $end_seq) for tenant $tenant_id"
    
    # Compute Merkle root
    local root_hash=$(compute_merkle_root "$hashes")
    verbose_log "Computed Merkle root: $root_hash"
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY RUN: Would sign root $root_hash for tenant $tenant_id ($entry_count entries)"
        return 0
    fi
    
    # Sign the root
    local temp_file=$(mktemp)
    local signature
    
    if signature=$(sign_root "$root_hash" "$temp_file"); then
        verbose_log "Successfully signed root hash"
        
        # Store the signed root
        local root_id="root_$(date +%s)_$(openssl rand -hex 4)"
        local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S+00')
        
        local insert_query="
            INSERT INTO provenance_ledger_roots (
                id, tenant_id, root_hash, start_sequence, end_sequence,
                entry_count, timestamp, signature, cosign_bundle
            ) VALUES (
                '$root_id',
                '$tenant_id',
                '$root_hash',
                $start_seq,
                $end_seq,
                $entry_count,
                '$timestamp',
                '$signature',
                NULL
            );
        "
        
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "$insert_query" >/dev/null 2>&1; then
            
            log "INFO" "Created signed root $root_id for tenant $tenant_id ($entry_count entries)"
            
            # Backup the root
            local backup_file="$BACKUP_DIR/root_${tenant_id}_$(date +%Y%m%d_%H%M%S).json"
            cat > "$backup_file" << EOF
{
    "id": "$root_id",
    "tenantId": "$tenant_id",
    "rootHash": "$root_hash",
    "startSequence": $start_seq,
    "endSequence": $end_seq,
    "entryCount": $entry_count,
    "timestamp": "$timestamp",
    "signature": "$signature",
    "signedAt": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
    "signedBy": "$(whoami)@$(hostname)"
}
EOF
            verbose_log "Backed up root to $backup_file"
            
        else
            log "ERROR" "Failed to store signed root for tenant $tenant_id"
            rm -f "$temp_file" "${temp_file}.sig" "${temp_file}.crt"
            return 1
        fi
        
    else
        log "ERROR" "Failed to sign root for tenant $tenant_id"
        rm -f "$temp_file" "${temp_file}.sig" "${temp_file}.crt"
        return 1
    fi
    
    # Cleanup
    rm -f "$temp_file" "${temp_file}.sig" "${temp_file}.crt"
    
    return 0
}

verify_signature() {
    local root_hash="$1"
    local signature="$2"
    
    local temp_file=$(mktemp)
    local temp_sig=$(mktemp)
    
    echo -n "$root_hash" > "$temp_file"
    echo "$signature" > "$temp_sig"
    
    if cosign verify-blob --key "${COSIGN_KEY}.pub" --signature "$temp_sig" "$temp_file" >/dev/null 2>&1; then
        rm -f "$temp_file" "$temp_sig"
        return 0
    else
        rm -f "$temp_file" "$temp_sig"
        return 1
    fi
}

generate_report() {
    local signed_count="$1"
    local failed_count="$2"
    
    log "INFO" "=== LEDGER SIGNING REPORT ==="
    log "INFO" "Signed roots: $signed_count"
    log "INFO" "Failed signings: $failed_count"
    log "INFO" "Total processed: $((signed_count + failed_count))"
    
    # Get overall statistics
    local stats_query="
        SELECT 
            COUNT(DISTINCT tenant_id) as tenant_count,
            COUNT(*) as total_roots,
            MAX(timestamp) as latest_root,
            MIN(timestamp) as earliest_root
        FROM provenance_ledger_roots;
    "
    
    local stats=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "$stats_query" | sed 's/^[ \t]*//')
    
    log "INFO" "Database stats: $stats"
    log "INFO" "Report completed at $(date)"
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--tenant-id)
                TENANT_ID="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE_SIGN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    log "INFO" "Starting ledger signing process"
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY RUN MODE - No actual signing will be performed"
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Get tenants to sign
    local tenants
    if ! tenants=$(get_tenants_to_sign); then
        log "ERROR" "Failed to get tenant list"
        exit 1
    fi
    
    if [ -z "$tenants" ]; then
        log "INFO" "No tenants require signing"
        exit 0
    fi
    
    local tenant_count=$(echo "$tenants" | wc -l)
    log "INFO" "Found $tenant_count tenant(s) requiring signing"
    
    # Sign roots for each tenant
    local signed_count=0
    local failed_count=0
    
    while IFS= read -r tenant; do
        if [ -n "$tenant" ]; then
            if create_signed_root "$tenant"; then
                signed_count=$((signed_count + 1))
            else
                failed_count=$((failed_count + 1))
            fi
        fi
    done <<< "$tenants"
    
    # Generate report
    generate_report "$signed_count" "$failed_count"
    
    if [ "$failed_count" -gt 0 ]; then
        log "ERROR" "Some signings failed. Check logs for details."
        exit 1
    fi
    
    log "INFO" "Ledger signing completed successfully"
}

# Handle signals
trap 'log "ERROR" "Script interrupted"; exit 130' INT TERM

# Run main function
main "$@"