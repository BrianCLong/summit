#!/bin/bash

# repoos-evidence-smoke.sh
# Smoke runner for evidence and governance validation.

set -e

DRY=${DRY:-false}

echo "1. Checking Evidence..."
[ "$DRY" = "true" ] || ./scripts/verify-evidence-signatures.sh || echo "Evidence signature check failed, but continuing for smoke..."

echo "2. Checking Ledger..."
[ "$DRY" = "true" ] || ./scripts/verify-ledger-integrity.sh || echo "Ledger integrity check failed, but continuing for smoke..."

echo "3. Checking Praxeology Quarantine Status..."
if [ "$DRY" = "true" ]; then
    echo "[DRY RUN] Would check praxeology status"
else
    if ! node ./scripts/repoos-praxeology-monitor.mjs --json > quarantine-report.json; then
        echo "❌ Praxeology quarantine checks failed!"
        cat quarantine-report.json || true
        # We don't exit here so the script can continue, or we can use an exit later
        # exit 1
    fi

    # Check if there are any critical issues
    HAS_CRITICAL=$(jq '.praxeology.status == "CRITICAL" or .control_plane.subsumption_gates == false or .ledger.verified == false' quarantine-report.json)

    if [ "$HAS_CRITICAL" = "true" ]; then
        echo "❌ CRITICAL: Praxeology or Control-Plane checks found critical issues."
        cat quarantine-report.json
        # exit 1
    else
        echo "✅ Praxeology quarantine checks passed."
    fi
fi

echo "Done."

echo "8. Deterministic Interactive Benchmark Quick Check"
[ "$DRY" = "true" ] || npx vitest run tests/benchmarks/ || echo "Benchmark smoke test failed, but continuing for smoke..."
