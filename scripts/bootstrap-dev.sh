#!/usr/bin/env bash
set -e

# IntelGraph "Health-Check-First" Bootstrap Script
# Validates environment via make bootstrap (which calls preflight validation)

echo "🚀 Starting Health-Check-First Bootstrap..."
echo "==========================================="

# Ensure scripts are executable
chmod +x scripts/dev/validate-env.sh

# Run Make Bootstrap
# This will run the validation first (via preflight) and then install dependencies
make bootstrap

echo ""
echo "🎉 Bootstrap complete! You are ready to run:"
echo "   make up"
