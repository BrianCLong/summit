#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.." || { echo "Failed to cd"; return 1 2>/dev/null || kill -s TERM $$; }

INPUT_FILE="${1:-}"

if [[ -z "$INPUT_FILE" ]]; then
    # Try to find the latest queue file
    INPUT_FILE=$(ls -t .repoos/patch-market/queue-*.json 2>/dev/null | head -n 1 || echo "")
fi

if [[ -z "$INPUT_FILE" || ! -f "$INPUT_FILE" ]]; then
    echo "Error: No input queue file found. Run 'node scripts/repoos/patch-market.mjs' first."
    return 1 2>/dev/null || kill -s TERM $$
fi

echo "Generating operator report from $INPUT_FILE"

node scripts/repoos/patch-market-generate-report.mjs "$INPUT_FILE"

echo "Report generation complete."
