#!/bin/bash
# Wrapper to run the PR Backlog Monitor

set -e

# Detect if we are in a CI/Sandbox environment without gh
if ! command -v gh &> /dev/null; then
    echo "⚠️  'gh' CLI not found. Running in MOCK mode for demonstration."
    npx tsx scripts/pr_backlog_monitor.ts --mock
else
    npx tsx scripts/pr_backlog_monitor.ts "$@"
fi
