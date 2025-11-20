#!/bin/bash
set -euo pipefail

#
# Log Archival Script
#
# Archives logs older than retention period to S3-compatible storage
#

# Configuration
RETENTION_DAYS=${RETENTION_DAYS:-30}
ARCHIVE_BUCKET=${ARCHIVE_BUCKET:-"s3://intelgraph-logs-archive"}
LOG_DIR=${LOG_DIR:-"/var/log/intelgraph"}
LOKI_URL=${LOKI_URL:-"http://localhost:3100"}
ENVIRONMENT=${ENVIRONMENT:-"production"}
DRY_RUN=${DRY_RUN:-false}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN:${NC} $*"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" >&2
}

# Check dependencies
check_dependencies() {
  local missing_deps=()

  if ! command -v aws &> /dev/null; then
    missing_deps+=("aws-cli")
  fi

  if ! command -v jq &> /dev/null; then
    missing_deps+=("jq")
  fi

  if [ ${#missing_deps[@]} -gt 0 ]; then
    error "Missing dependencies: ${missing_deps[*]}"
    error "Please install missing dependencies and try again"
    exit 1
  fi
}

# Archive file-based logs
archive_file_logs() {
  log "Archiving file-based logs older than ${RETENTION_DAYS} days..."

  if [ ! -d "$LOG_DIR" ]; then
    warn "Log directory not found: $LOG_DIR"
    return
  fi

  local archive_date=$(date -d "${RETENTION_DAYS} days ago" +%Y/%m/%d)
  local total_files=0
  local total_size=0

  while IFS= read -r -d '' file; do
    local filename=$(basename "$file")
    local filesize=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
    local file_date=$(date -r "$file" +%Y/%m/%d)

    local s3_path="${ARCHIVE_BUCKET}/${ENVIRONMENT}/${file_date}/${filename}.gz"

    if [ "$DRY_RUN" = true ]; then
      log "DRY RUN: Would archive $file -> $s3_path"
    else
      log "Archiving: $file ($filesize bytes)"

      # Compress and upload
      gzip -c "$file" | aws s3 cp - "$s3_path" \
        --storage-class GLACIER_IR \
        --metadata "original-size=${filesize},archived-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

      if [ $? -eq 0 ]; then
        # Verify upload
        aws s3 head-object --bucket "${ARCHIVE_BUCKET#s3://}" --key "${s3_path#s3://*bucket*/}" > /dev/null

        if [ $? -eq 0 ]; then
          log "Successfully archived and verified: $file"

          # Delete original file
          rm "$file"
          log "Deleted original file: $file"

          ((total_files++))
          ((total_size+=filesize))
        else
          error "Failed to verify uploaded file: $s3_path"
        fi
      else
        error "Failed to upload file: $file"
      fi
    fi
  done < <(find "$LOG_DIR" -name "*.log" -mtime +$RETENTION_DAYS -type f -print0)

  if [ $total_files -gt 0 ]; then
    log "Archived $total_files files ($(numfmt --to=iec-i --suffix=B $total_size))"
  else
    log "No files to archive"
  fi
}

# Archive Loki data
archive_loki_data() {
  log "Archiving Loki data older than ${RETENTION_DAYS} days..."

  # Calculate timestamps
  local end_time=$(date -d "${RETENTION_DAYS} days ago" +%s)
  local start_time=$(date -d "$((RETENTION_DAYS + 1)) days ago" +%s)

  # Query for all streams in the retention window
  local query='{}'
  local archive_date=$(date -d "${RETENTION_DAYS} days ago" +%Y/%m/%d)

  if [ "$DRY_RUN" = true ]; then
    log "DRY RUN: Would archive Loki data from $(date -d "@${start_time}") to $(date -d "@${end_time}")"
    return
  fi

  # Export logs from Loki
  local temp_file=$(mktemp)
  local archive_file="${temp_file}.json.gz"

  log "Exporting logs from Loki..."

  curl -s -G "${LOKI_URL}/loki/api/v1/query_range" \
    --data-urlencode "query=${query}" \
    --data-urlencode "start=${start_time}000000000" \
    --data-urlencode "end=${end_time}000000000" \
    --data-urlencode "limit=100000" | \
    jq -c '.data.result[]' | \
    gzip > "$archive_file"

  if [ -s "$archive_file" ]; then
    local filesize=$(stat -f%z "$archive_file" 2>/dev/null || stat -c%s "$archive_file")

    # Upload to S3
    local s3_path="${ARCHIVE_BUCKET}/${ENVIRONMENT}/${archive_date}/loki-export-${start_time}.json.gz"

    log "Uploading to S3: $s3_path ($filesize bytes)"

    aws s3 cp "$archive_file" "$s3_path" \
      --storage-class GLACIER_IR \
      --metadata "start-time=${start_time},end-time=${end_time},archived-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    if [ $? -eq 0 ]; then
      log "Successfully archived Loki data"

      # Generate checksum
      local checksum=$(sha256sum "$archive_file" | awk '{print $1}')
      echo "$checksum" | aws s3 cp - "${s3_path}.sha256"

      log "Checksum: $checksum"
    else
      error "Failed to upload Loki archive"
    fi

    rm -f "$temp_file" "$archive_file"
  else
    warn "No Loki data to archive for specified period"
    rm -f "$temp_file" "$archive_file"
  fi
}

# Generate archival report
generate_report() {
  log "Generating archival report..."

  local report_file="/tmp/archival-report-$(date +%Y%m%d).json"

  cat > "$report_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "retention_days": ${RETENTION_DAYS},
  "archive_bucket": "${ARCHIVE_BUCKET}",
  "dry_run": ${DRY_RUN}
}
EOF

  log "Report saved to: $report_file"

  # Optionally send to monitoring/alerting system
  if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"Log archival completed for ${ENVIRONMENT}\", \"attachments\": [{\"text\": \"$(cat $report_file)\"}]}"
  fi
}

# Main execution
main() {
  log "Starting log archival process"
  log "Environment: $ENVIRONMENT"
  log "Retention: $RETENTION_DAYS days"
  log "Archive bucket: $ARCHIVE_BUCKET"

  if [ "$DRY_RUN" = true ]; then
    warn "DRY RUN MODE - No files will be modified"
  fi

  check_dependencies

  archive_file_logs
  archive_loki_data
  generate_report

  log "Log archival complete"
}

# Handle errors
trap 'error "Archival failed at line $LINENO"' ERR

main "$@"
