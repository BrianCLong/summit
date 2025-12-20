#!/usr/bin/env bash
set -euo pipefail

# File Storage Backup System
# Backs up uploaded files with S3 versioning and deduplication

# Configuration
UPLOADS_DIR="${UPLOADS_DIR:-./server/uploads}"
BACKUP_BASE="${BACKUP_BASE:-./backups/files}"
S3_BUCKET="${S3_BUCKET:-summit-file-backups}"
S3_PREFIX="${S3_PREFIX:-files}"
ENABLE_DEDUPLICATION="${ENABLE_DEDUPLICATION:-true}"
ENABLE_COMPRESSION="${ENABLE_COMPRESSION:-true}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

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

# Calculate file hash for deduplication
calculate_hash() {
    local file="$1"
    sha256sum "$file" | cut -d' ' -f1
}

# Create backup with deduplication
create_backup_with_deduplication() {
    local timestamp=$(date -u +%Y%m%dT%H%M%SZ)
    local backup_dir="$BACKUP_BASE/$timestamp"
    local manifest_file="$backup_dir/manifest.json"
    local hash_store="$BACKUP_BASE/.hash_store"

    log_info "Creating file backup with deduplication..."

    mkdir -p "$backup_dir/data"
    mkdir -p "$hash_store"

    # Initialize manifest
    echo '{"timestamp":"'$(date -u -Iseconds)'","files":[]}' > "$manifest_file"

    # Track statistics
    local total_files=0
    local deduplicated_files=0
    local total_size=0
    local saved_size=0

    # Process each file
    find "$UPLOADS_DIR" -type f | while read -r file; do
        ((total_files++)) || true

        local relative_path="${file#$UPLOADS_DIR/}"
        local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
        ((total_size+=file_size)) || true

        # Calculate hash
        local file_hash=$(calculate_hash "$file")

        # Check if file already exists in hash store
        if [ -f "$hash_store/$file_hash" ]; then
            # File already backed up (deduplication)
            log_info "Deduplicating: $relative_path (hash: ${file_hash:0:12}...)"
            ((deduplicated_files++)) || true
            ((saved_size+=file_size)) || true

            # Add reference to manifest
            jq --arg path "$relative_path" \
               --arg hash "$file_hash" \
               --arg size "$file_size" \
               '.files += [{
                   "path": $path,
                   "hash": $hash,
                   "size": ($size | tonumber),
                   "deduplicated": true
               }]' "$manifest_file" > "$manifest_file.tmp"
            mv "$manifest_file.tmp" "$manifest_file"
        else
            # New file - copy and store hash
            log_info "Backing up: $relative_path ($(numfmt --to=iec $file_size))"

            local dest_dir="$backup_dir/data/$(dirname "$relative_path")"
            mkdir -p "$dest_dir"

            if [ "$ENABLE_COMPRESSION" = "true" ] && [[ ! "$file" =~ \.(gz|zip|png|jpg|jpeg)$ ]]; then
                # Compress file
                gzip -c "$file" > "$dest_dir/$(basename "$file").gz"
                local compressed_size=$(stat -f%z "$dest_dir/$(basename "$file").gz" 2>/dev/null || stat -c%s "$dest_dir/$(basename "$file").gz")
                log_info "Compressed: $(numfmt --to=iec $file_size) -> $(numfmt --to=iec $compressed_size)"
            else
                # Copy without compression
                cp "$file" "$dest_dir/"
            fi

            # Store hash reference
            echo "$relative_path" > "$hash_store/$file_hash"

            # Add to manifest
            jq --arg path "$relative_path" \
               --arg hash "$file_hash" \
               --arg size "$file_size" \
               '.files += [{
                   "path": $path,
                   "hash": $hash,
                   "size": ($size | tonumber),
                   "deduplicated": false
               }]' "$manifest_file" > "$manifest_file.tmp"
            mv "$manifest_file.tmp" "$manifest_file"
        fi
    done

    # Update manifest with statistics
    jq --arg total "$total_files" \
       --arg dedup "$deduplicated_files" \
       --arg total_size "$total_size" \
       --arg saved_size "$saved_size" \
       '.statistics = {
           "total_files": ($total | tonumber),
           "deduplicated_files": ($dedup | tonumber),
           "total_size_bytes": ($total_size | tonumber),
           "saved_size_bytes": ($saved_size | tonumber),
           "deduplication_ratio": (($saved_size | tonumber) / ($total_size | tonumber) * 100 | floor)
       }' "$manifest_file" > "$manifest_file.tmp"
    mv "$manifest_file.tmp" "$manifest_file"

    log_success "Backup created: $backup_dir"
    log_info "Total files: $total_files"
    log_info "Deduplicated: $deduplicated_files"
    log_info "Space saved: $(numfmt --to=iec $saved_size) ($(jq -r '.statistics.deduplication_ratio' "$manifest_file")%)"

    echo "$backup_dir"
}

# Create simple backup without deduplication
create_simple_backup() {
    local timestamp=$(date -u +%Y%m%dT%H%M%SZ)
    local backup_dir="$BACKUP_BASE/$timestamp"

    log_info "Creating simple file backup..."

    mkdir -p "$backup_dir"

    if [ "$ENABLE_COMPRESSION" = "true" ]; then
        tar -czf "$backup_dir/uploads.tar.gz" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
        log_success "Backup created (compressed): $backup_dir/uploads.tar.gz"
    else
        tar -cf "$backup_dir/uploads.tar" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
        log_success "Backup created: $backup_dir/uploads.tar"
    fi

    echo "$backup_dir"
}

# Upload backup to S3 with versioning
upload_to_s3() {
    local backup_dir="$1"
    local timestamp=$(basename "$backup_dir")

    if ! command -v aws >/dev/null 2>&1; then
        log_warn "AWS CLI not found, skipping S3 upload"
        return 0
    fi

    log_info "Uploading backup to S3..."

    # Enable versioning on bucket if not already enabled
    aws s3api put-bucket-versioning \
        --bucket "$S3_BUCKET" \
        --versioning-configuration Status=Enabled \
        2>/dev/null || log_warn "Could not enable versioning (may already be enabled)"

    # Enable lifecycle policy for old versions
    cat > /tmp/lifecycle-policy.json <<EOF
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    },
    {
      "Id": "TransitionOldVersionsToGlacier",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
EOF

    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$S3_BUCKET" \
        --lifecycle-configuration file:///tmp/lifecycle-policy.json \
        2>/dev/null || log_warn "Could not set lifecycle policy"

    # Sync backup to S3
    if [ "$ENABLE_DEDUPLICATION" = "true" ]; then
        # Upload manifest and unique files
        aws s3 sync "$backup_dir" "s3://$S3_BUCKET/$S3_PREFIX/$timestamp/" \
            --storage-class STANDARD_IA \
            --metadata "backup-timestamp=$timestamp,deduplication=enabled"
    else
        # Upload tarball
        aws s3 cp "$backup_dir/"*.tar* "s3://$S3_BUCKET/$S3_PREFIX/$timestamp/" \
            --storage-class STANDARD_IA \
            --metadata "backup-timestamp=$timestamp"
    fi

    log_success "Uploaded to s3://$S3_BUCKET/$S3_PREFIX/$timestamp/"

    # Get version ID
    local version_id=$(aws s3api list-object-versions \
        --bucket "$S3_BUCKET" \
        --prefix "$S3_PREFIX/$timestamp/" \
        --query 'Versions[0].VersionId' \
        --output text)

    log_info "S3 Version ID: $version_id"

    # Save version ID to manifest
    if [ -f "$backup_dir/manifest.json" ]; then
        jq --arg version "$version_id" \
           --arg s3_uri "s3://$S3_BUCKET/$S3_PREFIX/$timestamp/" \
           '.s3 = {"version_id": $version, "uri": $s3_uri}' \
           "$backup_dir/manifest.json" > "$backup_dir/manifest.json.tmp"
        mv "$backup_dir/manifest.json.tmp" "$backup_dir/manifest.json"
    fi
}

# Encrypt backup
encrypt_backup() {
    local backup_dir="$1"

    if [ -z "$ENCRYPTION_KEY" ]; then
        log_warn "No encryption key provided, skipping encryption"
        return 0
    fi

    log_info "Encrypting backup..."

    # Use age encryption (modern alternative to GPG)
    if command -v age >/dev/null 2>&1; then
        find "$backup_dir" -type f ! -name "*.age" | while read -r file; do
            age -p -o "$file.age" "$file" <<< "$ENCRYPTION_KEY"
            rm "$file"  # Remove unencrypted file
            log_info "Encrypted: $(basename "$file")"
        done
        log_success "Backup encrypted with age"
    elif command -v gpg >/dev/null 2>&1; then
        find "$backup_dir" -type f ! -name "*.gpg" | while read -r file; do
            echo "$ENCRYPTION_KEY" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 "$file"
            rm "$file"  # Remove unencrypted file
            log_info "Encrypted: $(basename "$file")"
        done
        log_success "Backup encrypted with GPG"
    else
        log_error "Neither age nor gpg found for encryption"
        return 1
    fi
}

# Main execution
main() {
    local backup_start=$(date +%s)

    if [ ! -d "$UPLOADS_DIR" ]; then
        log_error "Uploads directory not found: $UPLOADS_DIR"
        exit 1
    fi

    mkdir -p "$BACKUP_BASE"

    # Create backup
    local backup_dir
    if [ "$ENABLE_DEDUPLICATION" = "true" ]; then
        backup_dir=$(create_backup_with_deduplication)
    else
        backup_dir=$(create_simple_backup)
    fi

    # Encrypt if configured
    if [ -n "$ENCRYPTION_KEY" ]; then
        encrypt_backup "$backup_dir"
    fi

    # Upload to S3
    upload_to_s3 "$backup_dir"

    local backup_end=$(date +%s)
    local backup_duration=$((backup_end - backup_start))

    # Calculate final backup size
    local backup_size=$(du -sb "$backup_dir" | cut -f1)

    # Update Prometheus metrics
    cat <<EOF | curl -X POST --data-binary @- http://pushgateway:9091/metrics/job/file_backup/instance/$(hostname) 2>/dev/null || true
# HELP file_backup_duration_seconds Duration of file backup
# TYPE file_backup_duration_seconds gauge
file_backup_duration_seconds $backup_duration
# HELP file_backup_size_bytes Size of file backup
# TYPE file_backup_size_bytes gauge
file_backup_size_bytes $backup_size
# HELP file_backup_last_success_timestamp Last successful file backup
# TYPE file_backup_last_success_timestamp gauge
file_backup_last_success_timestamp $backup_end
EOF

    log_success "File backup completed in ${backup_duration}s"
    log_info "Backup location: $backup_dir"
    log_info "Backup size: $(numfmt --to=iec $backup_size)"
}

# Run main function
main "$@"
