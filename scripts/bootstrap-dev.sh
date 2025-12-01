#!/usr/bin/env bash
set -e

# IntelGraph "Health-Check-First" Bootstrap Script
# Validates environment via make bootstrap (which calls preflight validation)

echo "🚀 Starting Health-Check-First Bootstrap..."
echo "==========================================="

# Run Make Bootstrap
# This includes the 'preflight' target which runs scripts/dev/validate-env.sh
make bootstrap

echo ""
echo "🎉 Bootstrap complete! You are ready to run:"
echo "   make up"
