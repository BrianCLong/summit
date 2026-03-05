#!/bin/bash
# Jules-optimized local radar
# Runs checks locally to simulate the GitHub Action logic

set -e

echo "=== GA Blocker Radar (Local) ==="

# 1. Check Drift
echo "Checking Branch Protection Drift..."
if [ -f scripts/release/check_branch_protection_drift.sh ]; then
  bash scripts/release/check_branch_protection_drift.sh > drift.log 2>&1 || true
  if grep -qiE "drift|mismatch|non.?compliant|failed" drift.log; then
    echo "  [FAIL] Drift Detected"
    DRIFT="true"
  else
    echo "  [PASS] No Drift"
    DRIFT="false"
  fi
else
  echo "  [SKIP] No drift script found."
fi

# 2. Check Evidence Determinism
echo "Checking Evidence Determinism..."
if [ -f scripts/release/generate_evidence_bundle.mjs ]; then
  mkdir -p .radar/out1 .radar/out2
  mkdir -p artifacts/supplychain
  touch artifacts/supplychain/mock.txt

  echo "  Run 1..."
  node scripts/release/generate_evidence_bundle.mjs > run1.log 2>&1 || true
  cp artifacts/evidence-bundle.json .radar/out1/evidence-bundle.json || true

  sleep 1.1

  echo "  Run 2..."
  node scripts/release/generate_evidence_bundle.mjs > run2.log 2>&1 || true
  cp artifacts/evidence-bundle.json .radar/out2/evidence-bundle.json || true

  # Diff
  if diff -q .radar/out1/evidence-bundle.json .radar/out2/evidence-bundle.json > /dev/null; then
    echo "  [PASS] Deterministic"
    DET="true"
  else
    echo "  [FAIL] Non-deterministic (check .radar/out1 vs out2)"
    DET="false"
  fi
else
  echo "  [SKIP] No evidence script found."
fi

echo "=== Summary ==="
if [ "$DRIFT" == "true" ]; then
  echo "TOP BLOCKER: Branch Protection Drift"
elif [ "$DET" == "false" ]; then
  echo "TOP BLOCKER: Evidence Nondeterminism"
else
  echo "No local blockers detected (check CI for required checks)."
fi
