#!/usr/bin/env bash
set -euo pipefail

if [[ "${SUMMIT_ENABLE_CLAUDE_PLUGIN_SCAN:-false}" != "true" ]]; then
  echo "Claude plugin scan is disabled. Set SUMMIT_ENABLE_CLAUDE_PLUGIN_SCAN=true to enable."
  exit 0
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <manifest.json> [output-dir]"
  exit 2
fi

MANIFEST_PATH="$1"
OUTPUT_DIR="${2:-runs/claude-plugin-scan}"
THRESHOLD="${SUMMIT_CLAUDE_PLUGIN_RISK_THRESHOLD:-8}"

python3 plugins/claude/analyzer.py "$MANIFEST_PATH" --output-dir "$OUTPUT_DIR" --threshold "$THRESHOLD"
