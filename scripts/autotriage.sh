#!/bin/bash
# Autotriage Engine Wrapper
# Automatically triages backlog, bug-bash, and GitHub issues
# Usage: ./scripts/autotriage.sh [options]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
AUTOTRIAGE_DIR="$PROJECT_ROOT/assistant/autotriage"

# Change to project root
cd "$PROJECT_ROOT"

# Build TypeScript if needed
if [ ! -f "$AUTOTRIAGE_DIR/cli.js" ] || [ "$AUTOTRIAGE_DIR/cli.ts" -nt "$AUTOTRIAGE_DIR/cli.js" ]; then
    echo "📦 Building autotriage engine..."
    cd "$AUTOTRIAGE_DIR"
    npx tsc --skipLibCheck
    cd "$PROJECT_ROOT"
fi

# Run CLI
node "$AUTOTRIAGE_DIR/cli.js" "$@"
