#!/bin/bash
# Check for GA Baseline Drift
# Usage: ./scripts/ga/check_drift.sh

set -e

BASELINE_HASH_FILE="docs/ga/ga-baseline.sha256"

echo "🔍 Verifying GA Baseline Artifacts..."

if [ ! -f "$BASELINE_HASH_FILE" ]; then
    echo "❌ Baseline hash file not found: $BASELINE_HASH_FILE"
    exit 1
fi

if sha256sum -c "$BASELINE_HASH_FILE"; then
    echo "✅ GA Baseline verified. No drift detected."
    exit 0
else
    echo "❌ DRIFT DETECTED! One or more GA baseline files have changed."
    echo "   If this is intentional (e.g. a patch release), update the hashes:"
    echo "   sha256sum docs/SUMMIT_READINESS_ASSERTION.md docs/releases/MVP-4_GA_BASELINE.md docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md package.json docs/ga/MVP4_GA_BASELINE.md > docs/ga/ga-baseline.sha256"
    exit 1
fi
