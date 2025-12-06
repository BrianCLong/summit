#!/bin/bash
# Wrapper to run the Summit CLI

# Determine directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BOOTSTRAP_ROOT="$(dirname "$DIR")"

# Execute using tsx
npx tsx "$BOOTSTRAP_ROOT/src/cli.ts" "$@"
