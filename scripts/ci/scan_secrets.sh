#!/bin/bash
# Security wrapper for Gitleaks
# Usage: ./scripts/ci/scan_secrets.sh [--ci]

set -e

# Default to "protect" mode (staged changes) for local dev
MODE="protect --staged"

if [[ "$1" == "--ci" ]]; then
    # In CI, we want to detect secrets in the entire history or specific range
    # usually "detect" command.
    echo "🛡️  Running Gitleaks in CI mode (detect)..."
    MODE="detect --verbose --redact"
else
    echo "🛡️  Running Gitleaks in Local mode (protect --staged)..."
fi

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo "❌ gitleaks not found. Please install it (brew install gitleaks)."
    exit 1
fi

# Run gitleaks
# We accept a config file if present, otherwise default
CONFIG_ARG=""
if [[ -f ".gitleaks.toml" ]]; then
    CONFIG_ARG="--config .gitleaks.toml"
fi

echo "Executing: gitleaks $MODE $CONFIG_ARG"
gitleaks $MODE $CONFIG_ARG

if [[ $? -eq 0 ]]; then
    echo "✅ No secrets found."
else
    echo "❌ Secrets detected! See output above."
    exit 1
fi
