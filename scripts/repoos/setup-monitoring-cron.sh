#!/bin/bash

# RepoOS Monitoring Cron Setup
#
# Sets up automated daily health checks and weekly accuracy analysis.
# Run this script once after deploying RepoOS to enable monitoring.
#
# Usage:
#   ./setup-monitoring-cron.sh
#
# What it does:
#   1. Adds daily health check (runs at 00:00 UTC)
#   2. Adds weekly accuracy analysis (runs Sunday at 01:00 UTC)
#   3. Validates cron entries
#   4. Provides verification commands

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         RepoOS Monitoring Cron Setup                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Repository Root: $REPO_ROOT"
echo ""

# Check if cron is available
if ! command -v crontab &> /dev/null; then
    echo "❌ crontab not found. Please install cron."
    exit 1
fi

echo "✅ cron available"
echo ""

# Create temp file for new crontab
TEMP_CRON=$(mktemp)
trap "rm -f $TEMP_CRON" EXIT

# Get existing crontab (if any)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# Check if entries already exist
if grep -q "repoos-daily-health-check" "$TEMP_CRON"; then
    echo "⚠️  RepoOS health check already in crontab"
    read -p "Replace existing entry? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping health check setup"
    else
        # Remove existing entry
        sed -i.bak '/repoos-daily-health-check/d' "$TEMP_CRON"
        echo "✅ Removed existing health check entry"
    fi
fi

if grep -q "repoos-classification-accuracy" "$TEMP_CRON"; then
    echo "⚠️  RepoOS accuracy analysis already in crontab"
    read -p "Replace existing entry? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping accuracy analysis setup"
    else
        # Remove existing entry
        sed -i.bak '/repoos-classification-accuracy/d' "$TEMP_CRON"
        echo "✅ Removed existing accuracy analysis entry"
    fi
fi

# Add new entries
echo "" >> "$TEMP_CRON"
echo "# RepoOS Evolution Intelligence System - Automated Monitoring" >> "$TEMP_CRON"
echo "" >> "$TEMP_CRON"

# Daily health check at 00:00 UTC
echo "# repoos-daily-health-check: Daily system health monitoring" >> "$TEMP_CRON"
echo "0 0 * * * cd $REPO_ROOT && node scripts/repoos/daily-health-check.mjs --alert >> logs/repoos-health.log 2>&1" >> "$TEMP_CRON"
echo "" >> "$TEMP_CRON"

# Weekly accuracy analysis on Sunday at 01:00 UTC
echo "# repoos-classification-accuracy: Weekly accuracy analysis" >> "$TEMP_CRON"
echo "0 1 * * 0 cd $REPO_ROOT && node scripts/repoos/monitor-classification-accuracy.mjs analyze 7 >> logs/repoos-accuracy.log 2>&1" >> "$TEMP_CRON"
echo "" >> "$TEMP_CRON"

# Install new crontab
echo ""
echo "Preview of new crontab entries:"
echo "─────────────────────────────────────────────────────────────"
tail -6 "$TEMP_CRON"
echo "─────────────────────────────────────────────────────────────"
echo ""

read -p "Install these cron entries? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create logs directory
    mkdir -p "$REPO_ROOT/logs"

    # Install crontab
    crontab "$TEMP_CRON"
    echo "✅ Crontab installed successfully"
else
    echo "❌ Installation cancelled"
    exit 1
fi

# Verify installation
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                Verification                                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "Current crontab:"
crontab -l | grep -A 1 "repoos-"

echo ""
echo "✅ Monitoring setup complete!"
echo ""
echo "📅 Schedule:"
echo "  - Daily Health Check:     00:00 UTC daily"
echo "  - Accuracy Analysis:      01:00 UTC every Sunday"
echo ""
echo "📝 Logs:"
echo "  - Health Check:   $REPO_ROOT/logs/repoos-health.log"
echo "  - Accuracy:       $REPO_ROOT/logs/repoos-accuracy.log"
echo ""
echo "📊 Reports:"
echo "  - Daily Health:   $REPO_ROOT/.repoos/reports/daily-health-<date>.json"
echo "  - Accuracy:       $REPO_ROOT/.repoos/reports/classification-accuracy.json"
echo ""
echo "🔍 Test Commands:"
echo "  # Test health check"
echo "  node scripts/repoos/daily-health-check.mjs"
echo ""
echo "  # Test accuracy analysis"
echo "  node scripts/repoos/monitor-classification-accuracy.mjs analyze 7"
echo ""
echo "  # View cron status"
echo "  crontab -l | grep repoos"
echo ""
echo "  # View logs"
echo "  tail -f logs/repoos-health.log"
echo "  tail -f logs/repoos-accuracy.log"
echo ""
