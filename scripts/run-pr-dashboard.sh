#!/bin/bash

# PR Dashboard Runner
# Generates both console and HTML dashboards in one command

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🚀 Generating PR Dashboard..."
echo ""

# Step 1: Generate console dashboard and JSON report
echo "📊 Step 1: Analyzing git history and generating report..."
npx tsx scripts/pr-dashboard.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: Generate HTML dashboard
echo "🎨 Step 2: Generating interactive HTML dashboard..."
npx tsx scripts/generate-pr-dashboard-html.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Dashboard generation complete!"
echo ""
echo "📄 Files generated:"
echo "   - pr-dashboard-report.json (machine-readable data)"
echo "   - pr-dashboard.html (interactive web dashboard)"
echo ""
echo "🌐 To view the HTML dashboard:"
echo "   Open: file://$PROJECT_ROOT/pr-dashboard.html"
echo "   Or run: open pr-dashboard.html (macOS)"
echo "   Or run: xdg-open pr-dashboard.html (Linux)"
echo ""
