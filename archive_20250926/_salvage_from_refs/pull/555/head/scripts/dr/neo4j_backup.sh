#!/bin/bash
set -euo pipefail
BACKUP_DIR=${1:-backups}
mkdir -p "$BACKUP_DIR"
ARCHIVE="$BACKUP_DIR/neo4j-$(date +%Y%m%d%H%M%S).tar.gz"
neo4j-admin backup --to="$ARCHIVE"
sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
echo "Backup written to $ARCHIVE"
