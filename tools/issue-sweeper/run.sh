#!/bin/bash
# Convenience script to run issue-sweeper from repo root

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR" || exit 1

# Run the issue sweeper with all passed arguments
pnpm start -- "$@"
