#!/usr/bin/env bash
set -e

# Parse arguments
STAGE="all"
DRY="false"

for arg in "$@"; do
    case $arg in
        --stage=*)
        STAGE="${arg#*=}"
        shift
        ;;
        --dry)
        DRY="true"
        shift
        ;;
    esac
done

echo "Running RepoOS Full Sprint Smoke (Stage: $STAGE)"

# Assume existing RepoOS steps 1-4 would go here

if [ "$STAGE" = "all" ] || [ "$STAGE" = "sprint-mar10" ]; then
    echo "5. Praxeology Quarantined Validators Smoke"
    [ "$DRY" = "true" ] && echo "[DRY] Would validate PG writeset quarantines" || node scripts/verify-repoos.mjs --component praxeology --quarantine-check || pytest tests/**/test_*praxeology*.py -v

    echo "6. Control-Plane Foundation Lane"
    [ "$DRY" = "true" ] && echo "[DRY] Would validate control-plane lane" || ./scripts/validate-control-plane.sh || pnpm test --grep "control-plane|agent-lane|openclaw"

    echo "7. Deterministic Benchmark Substrate Quick"
    [ "$DRY" = "true" ] && echo "[DRY] Would run deterministic benchmarks" || pytest tests/benchmarks/** -k "interactive|deterministic" --junitxml=bench.xml
fi

echo "Smoke completed."
