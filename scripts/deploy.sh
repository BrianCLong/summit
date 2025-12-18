#!/usr/bin/env bash
set -euo pipefail

# Legacy Entry Point Wrapper
# Redirects to new multi-cluster management script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "⚠️  Using new multi-cluster deployment system..."
exec "$SCRIPT_DIR/multi-cluster/manage.sh" "$@"
