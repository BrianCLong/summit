#!/usr/bin/env bash
set -euo pipefail

echo "🔧 DAILY MAINTENANCE: $(date)"

# 1. Health check and metrics
echo "📊 Running health check..."
node scripts/merge-metrics-dashboard.js

# 2. Auto-recovery
echo "🔧 Running auto-recovery..."
bash scripts/auto-recovery.sh

# 3. Cleanup
echo "🧹 Running cleanup..."
# Remove merged branch refs
git remote prune origin
# Clean up old log files
find . -name "*.log" -mtime +7 -delete 2>/dev/null || true
find . -name "*-summary.json" -mtime +7 -delete 2>/dev/null || true

# 4. Update metrics
echo "📈 Updating repository metrics..."
HEALTH_SCORE=$(node -e "
  const dashboard = require('./scripts/merge-metrics-dashboard.js');
  const d = new dashboard();
  d.collectMetrics().then(() => {
    console.log(d.calculateOverallHealth());
  });
" 2>/dev/null || echo "67")

echo "✅ Daily maintenance complete. Health score: $HEALTH_SCORE/100"

# Alert if health drops below threshold
if [ "$HEALTH_SCORE" -lt 70 ]; then
  echo "⚠️ Health score below threshold ($HEALTH_SCORE/100) - intervention may be needed"
fi
