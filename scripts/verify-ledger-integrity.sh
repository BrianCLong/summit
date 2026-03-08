#!/bin/bash

# Summit Platform - Governance Ledger Integrity Verifier
# Offline/DB-less verification of signed ledger roots

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./evidence-bundle/ledger-backups}"
COSIGN_PUB_KEY="${COSIGN_PUB_KEY:-cosign.pub}"
REPORT_FILE="${REPORT_FILE:-ledger-integrity-report.json}"

log() {
    echo "[$(date +'%Y-%m-%dT%H:%M:%SZ')] $*"
}

verify_root() {
    local root_file="$1"
    local tenant_id=$(jq -r '.tenantId' "$root_file")
    local root_hash=$(jq -r '.rootHash' "$root_file")
    local signature=$(jq -r '.signature' "$root_file")
    local timestamp=$(jq -r '.timestamp' "$root_file")

    log "Verifying root for tenant: $tenant_id (Hash: ${root_hash:0:12}...)"

    # Create temporary files for cosign verification
    local temp_hash=$(mktemp)
    local temp_sig=$(mktemp)
    echo -n "$root_hash" > "$temp_hash"
    echo "$signature" > "$temp_sig"

    if cosign verify-blob --key "$COSIGN_PUB_KEY" --signature "$temp_sig" "$temp_hash" >/dev/null 2>&1; then
        rm -f "$temp_hash" "$temp_sig"
        return 0
    else
        log "ERROR: Signature verification failed for $tenant_id"
        rm -f "$temp_hash" "$temp_sig"
        return 1
    fi
}

main() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "ERROR: Backup directory $BACKUP_DIR not found"
        echo '{"verified": false, "error": "Backup directory missing"}' > "$REPORT_FILE"
        exit 1
    fi

    if [ ! -f "$COSIGN_PUB_KEY" ]; then
        log "ERROR: Public key $COSIGN_PUB_KEY not found"
        echo '{"verified": false, "error": "Public key missing"}' > "$REPORT_FILE"
        exit 1
    fi

    local total_verified=0
    local total_failed=0
    local latest_timestamp=""
    local latest_hash=""

    for root_file in "$BACKUP_DIR"/*.json; do
        [ -e "$root_file" ] || continue

        if verify_root "$root_file"; then
            total_verified=$((total_verified + 1))

            # Track latest root
            current_ts=$(jq -r '.timestamp' "$root_file")
            if [[ -z "$latest_timestamp" || "$current_ts" > "$latest_timestamp" ]]; then
                latest_timestamp="$current_ts"
                latest_hash=$(jq -r '.rootHash' "$root_file")
            fi
        else
            total_failed=$((total_failed + 1))
        fi
    done

    if [ "$total_verified" -gt 0 ] && [ "$total_failed" -eq 0 ]; then
        log "Successfully verified $total_verified ledger roots."
        cat << EOF > "$REPORT_FILE"
{
    "verified": true,
    "total_roots_checked": $total_verified,
    "latest_root_hash": "$latest_hash",
    "last_signed": "$latest_timestamp",
    "verification_timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
    else
        log "Verification failed. Verified: $total_verified, Failed: $total_failed"
        cat << EOF > "$REPORT_FILE"
{
    "verified": false,
    "total_verified": $total_verified,
    "total_failed": $total_failed,
    "error": "One or more roots failed verification",
    "verification_timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
        exit 1
    fi
}

main
