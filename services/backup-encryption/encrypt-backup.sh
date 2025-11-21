#!/usr/bin/env bash
set -euo pipefail

# Backup Encryption Service
# Provides AES-256 encryption for all backup types using age or GPG
# Supports key rotation and secure key management

# Configuration
ENCRYPTION_METHOD="${ENCRYPTION_METHOD:-age}"  # age or gpg
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/backup-keys/backup.key}"
KEY_ROTATION_DAYS="${KEY_ROTATION_DAYS:-90}"
BACKUP_DIR="${1:?Backup directory required}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} [INFO] $*"
}

log_success() {
    echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} [SUCCESS] $*"
}

log_error() {
    echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} [ERROR] $*" >&2
}

log_warn() {
    echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} [WARN] $*"
}

# Generate encryption key if doesn't exist
generate_key() {
    local key_dir=$(dirname "$ENCRYPTION_KEY_FILE")
    mkdir -p "$key_dir"
    chmod 700 "$key_dir"

    if [ "$ENCRYPTION_METHOD" = "age" ]; then
        if ! command -v age-keygen >/dev/null 2>&1; then
            log_error "age-keygen not found. Install age: https://github.com/FiloSottile/age"
            exit 1
        fi

        log_info "Generating age encryption key..."
        age-keygen -o "$ENCRYPTION_KEY_FILE" 2>/dev/null

        # Extract public key
        grep "public key:" "$ENCRYPTION_KEY_FILE" | cut -d: -f2 | tr -d ' ' > "${ENCRYPTION_KEY_FILE}.pub"

        log_success "Age key generated: $ENCRYPTION_KEY_FILE"
        log_info "Public key: $(cat "${ENCRYPTION_KEY_FILE}.pub")"

    elif [ "$ENCRYPTION_METHOD" = "gpg" ]; then
        log_info "Generating GPG passphrase..."
        openssl rand -base64 32 > "$ENCRYPTION_KEY_FILE"

        log_success "GPG passphrase generated: $ENCRYPTION_KEY_FILE"
    else
        log_error "Unknown encryption method: $ENCRYPTION_METHOD"
        exit 1
    fi

    chmod 600 "$ENCRYPTION_KEY_FILE"

    # Store key creation timestamp
    date -u +%Y-%m-%d > "${ENCRYPTION_KEY_FILE}.created"
}

# Check if key needs rotation
check_key_rotation() {
    if [ ! -f "${ENCRYPTION_KEY_FILE}.created" ]; then
        log_warn "Key creation date not found, assuming rotation needed"
        return 0
    fi

    local key_created=$(cat "${ENCRYPTION_KEY_FILE}.created")
    local days_since=$(( ($(date +%s) - $(date -d "$key_created" +%s)) / 86400 ))

    if [ "$days_since" -ge "$KEY_ROTATION_DAYS" ]; then
        log_warn "Encryption key is $days_since days old (rotation threshold: $KEY_ROTATION_DAYS days)"
        return 0
    fi

    return 1
}

# Rotate encryption key
rotate_key() {
    log_info "Rotating encryption key..."

    # Backup old key
    local old_key="${ENCRYPTION_KEY_FILE}.old-$(date +%Y%m%d)"
    cp "$ENCRYPTION_KEY_FILE" "$old_key"

    log_info "Old key backed up to: $old_key"

    # Generate new key
    generate_key

    log_success "Key rotation completed"
}

# Encrypt file with age
encrypt_with_age() {
    local input_file="$1"
    local output_file="${input_file}.age"

    if [ ! -f "${ENCRYPTION_KEY_FILE}.pub" ]; then
        log_error "Age public key not found: ${ENCRYPTION_KEY_FILE}.pub"
        return 1
    fi

    local public_key=$(cat "${ENCRYPTION_KEY_FILE}.pub")

    age -r "$public_key" -o "$output_file" "$input_file"

    if [ $? -eq 0 ]; then
        log_info "Encrypted with age: $(basename "$input_file")"
        return 0
    else
        log_error "Failed to encrypt: $(basename "$input_file")"
        return 1
    fi
}

# Decrypt file with age
decrypt_with_age() {
    local input_file="$1"
    local output_file="${input_file%.age}"

    age -d -i "$ENCRYPTION_KEY_FILE" -o "$output_file" "$input_file"

    if [ $? -eq 0 ]; then
        log_info "Decrypted with age: $(basename "$input_file")"
        return 0
    else
        log_error "Failed to decrypt: $(basename "$input_file")"
        return 1
    fi
}

# Encrypt file with GPG
encrypt_with_gpg() {
    local input_file="$1"
    local output_file="${input_file}.gpg"
    local passphrase=$(cat "$ENCRYPTION_KEY_FILE")

    echo "$passphrase" | gpg \
        --batch \
        --yes \
        --passphrase-fd 0 \
        --symmetric \
        --cipher-algo AES256 \
        --output "$output_file" \
        "$input_file"

    if [ $? -eq 0 ]; then
        log_info "Encrypted with GPG: $(basename "$input_file")"
        return 0
    else
        log_error "Failed to encrypt: $(basename "$input_file")"
        return 1
    fi
}

# Decrypt file with GPG
decrypt_with_gpg() {
    local input_file="$1"
    local output_file="${input_file%.gpg}"
    local passphrase=$(cat "$ENCRYPTION_KEY_FILE")

    echo "$passphrase" | gpg \
        --batch \
        --yes \
        --passphrase-fd 0 \
        --decrypt \
        --output "$output_file" \
        "$input_file"

    if [ $? -eq 0 ]; then
        log_info "Decrypted with GPG: $(basename "$input_file")"
        return 0
    else
        log_error "Failed to decrypt: $(basename "$input_file")"
        return 1
    fi
}

# Encrypt backup directory
encrypt_backup() {
    local backup_dir="$1"
    local encrypt_start=$(date +%s)

    log_info "Encrypting backup: $backup_dir"

    # Generate key if doesn't exist
    if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
        generate_key
    fi

    # Check if key rotation needed
    if check_key_rotation; then
        log_warn "Key rotation recommended but not performed during backup encryption"
        log_warn "Run with --rotate-key to rotate encryption key"
    fi

    local total_files=0
    local encrypted_files=0
    local failed_files=0

    # Find all files to encrypt (exclude already encrypted, metadata, and checksums)
    find "$backup_dir" -type f \
        ! -name "*.age" \
        ! -name "*.gpg" \
        ! -name "metadata.json" \
        ! -name "CHECKSUMS" \
        ! -name "*.created" | while read -r file; do

        ((total_files++)) || true

        if [ "$ENCRYPTION_METHOD" = "age" ]; then
            if encrypt_with_age "$file"; then
                rm "$file"  # Remove unencrypted file
                ((encrypted_files++)) || true
            else
                ((failed_files++)) || true
            fi
        elif [ "$ENCRYPTION_METHOD" = "gpg" ]; then
            if encrypt_with_gpg "$file"; then
                rm "$file"  # Remove unencrypted file
                ((encrypted_files++)) || true
            else
                ((failed_files++)) || true
            fi
        fi
    done

    # Create encryption metadata
    cat > "$backup_dir/encryption-metadata.json" <<EOF
{
  "encrypted": true,
  "method": "$ENCRYPTION_METHOD",
  "timestamp": "$(date -u -Iseconds)",
  "key_file": "$ENCRYPTION_KEY_FILE",
  "key_created": "$(cat "${ENCRYPTION_KEY_FILE}.created" 2>/dev/null || echo "unknown")",
  "files_encrypted": $encrypted_files,
  "files_failed": $failed_files
}
EOF

    local encrypt_end=$(date +%s)
    local encrypt_duration=$((encrypt_end - encrypt_start))

    log_success "Encryption completed in ${encrypt_duration}s"
    log_info "Encrypted files: $encrypted_files"
    log_info "Failed files: $failed_files"

    # Update Prometheus metrics
    cat <<EOF | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/backup_encryption/instance/$(hostname) 2>/dev/null || true
# HELP backup_encryption_duration_seconds Duration of backup encryption
# TYPE backup_encryption_duration_seconds gauge
backup_encryption_duration_seconds $encrypt_duration
# HELP backup_encryption_files_total Total files encrypted
# TYPE backup_encryption_files_total gauge
backup_encryption_files_total $encrypted_files
# HELP backup_encryption_failures_total Total encryption failures
# TYPE backup_encryption_failures_total counter
backup_encryption_failures_total $failed_files
EOF
}

# Decrypt backup directory
decrypt_backup() {
    local backup_dir="$1"
    local decrypt_start=$(date +%s)

    log_info "Decrypting backup: $backup_dir"

    # Check encryption metadata
    if [ ! -f "$backup_dir/encryption-metadata.json" ]; then
        log_error "Encryption metadata not found. Backup may not be encrypted."
        exit 1
    fi

    local encryption_method=$(jq -r '.method' "$backup_dir/encryption-metadata.json")

    if [ "$encryption_method" != "$ENCRYPTION_METHOD" ]; then
        log_warn "Backup encrypted with $encryption_method, but current method is $ENCRYPTION_METHOD"
        ENCRYPTION_METHOD="$encryption_method"
    fi

    local total_files=0
    local decrypted_files=0
    local failed_files=0

    # Find all encrypted files
    if [ "$ENCRYPTION_METHOD" = "age" ]; then
        find "$backup_dir" -type f -name "*.age" | while read -r file; do
            ((total_files++)) || true

            if decrypt_with_age "$file"; then
                rm "$file"  # Remove encrypted file
                ((decrypted_files++)) || true
            else
                ((failed_files++)) || true
            fi
        done
    elif [ "$ENCRYPTION_METHOD" = "gpg" ]; then
        find "$backup_dir" -type f -name "*.gpg" | while read -r file; do
            ((total_files++)) || true

            if decrypt_with_gpg "$file"; then
                rm "$file"  # Remove encrypted file
                ((decrypted_files++)) || true
            else
                ((failed_files++)) || true
            fi
        done
    fi

    local decrypt_end=$(date +%s)
    local decrypt_duration=$((decrypt_end - decrypt_start))

    log_success "Decryption completed in ${decrypt_duration}s"
    log_info "Decrypted files: $decrypted_files"
    log_info "Failed files: $failed_files"
}

# Main execution
main() {
    local operation="${2:-encrypt}"

    case "$operation" in
        encrypt)
            encrypt_backup "$BACKUP_DIR"
            ;;
        decrypt)
            decrypt_backup "$BACKUP_DIR"
            ;;
        generate-key)
            generate_key
            ;;
        rotate-key)
            rotate_key
            ;;
        *)
            echo "Usage: $0 <backup-dir> {encrypt|decrypt|generate-key|rotate-key}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
