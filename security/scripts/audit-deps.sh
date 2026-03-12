#!/bin/bash
set -e

# dependency-audit.sh - Summit Dependency Audit Script
# Runs pnpm audit and fails CI on high/critical vulnerabilities.

DRY_RUN=false
TEST_MODE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true ;;
        --test) TEST_MODE=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "Starting Dependency Audit..."

if [ "$TEST_MODE" = true ]; then
    echo "[TEST MODE] Mocking pnpm audit..."
    echo "Summary: 0 vulnerabilities found."
    exit 0
fi

if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would run: pnpm audit --audit-level high"
    exit 0
fi

if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed."
    exit 1
fi

echo "Running pnpm audit..."
pnpm audit --audit-level high

echo "Dependency audit passed."
