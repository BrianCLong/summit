#!/usr/bin/env bash
set -euo pipefail
echo "Summit RepoOS + Evidence Smoke (Mar 9 2026 sprint)"
DRY=${DRY_RUN:-false}

echo "1. RepoOS Governor Demo"
[ "$DRY" = "true" ] && echo "[DRY] " || node repoos-governor-demo.mjs --verbose

echo "2. GA Validation Showcase"
[ "$DRY" = "true" ] || node repoos-ga-validation-showcase.mjs

echo "3. Evidence Protocol Core Check"
[ "$DRY" = "true" ] || { ./verify-evidence-signatures.sh && ./verify-ledger-integrity.sh; }

echo "4. Deterministic Parity Quick"
[ "$DRY" = "true" ] || pytest tests/**/test_*determinism*.py -k "postgres or neo4j" -v

echo "Summary: All passed (or dry-run)"
