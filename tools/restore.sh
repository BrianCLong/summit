#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a
ARCHIVE="${1:-}"
[ -f "$ARCHIVE" ] || { echo "usage: tools/restore.sh <archive.tgz>"; exit 2; }
tar -xzf "$ARCHIVE"
echo "Restored from $ARCHIVE"
