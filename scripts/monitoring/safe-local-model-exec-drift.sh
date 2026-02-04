#!/usr/bin/env bash
set -euo pipefail

# Safe Local Model Execution - Drift Detector
# Detects missing invariants: deny_all, run_policy_check invocation, etc.

fail=0

echo "Checking Egress Policy for deny_all: true..."
if ! grep -q "\"deny_all\": true" policies/egress-allowlist.json; then
  echo "❌ DRIFT: Egress policy is not deny-by-default!"
  fail=1
else
  echo "✅ Egress policy is deny-by-default."
fi

echo "Checking run.sh for policy check hook..."
if ! grep -q "run_policy_check.mjs" runtime/run.sh; then
  echo "❌ DRIFT: Launcher is missing the policy check hook!"
  fail=1
else
  echo "✅ Launcher includes policy check."
fi

echo "Checking for deterministic receipt configuration..."
if ! grep -q "STAMP_PATH" runtime/run.sh; then
  echo "❌ DRIFT: Launcher does not separate timestamps into stamp.json!"
  fail=1
else
  echo "✅ Launcher supports deterministic receipts."
fi

# Output stable JSON for CI monitoring
cat > scripts/monitoring/safe-local-model-exec-drift.json <<EOF
{
  "deny_all_present": $(grep -q "\"deny_all\": true" policies/egress-allowlist.json && echo true || echo false),
  "policy_check_hooked": $(grep -q "run_policy_check.mjs" runtime/run.sh && echo true || echo false),
  "deterministic_receipts": $(grep -q "STAMP_PATH" runtime/run.sh && echo true || echo false)
}
EOF

if [ $fail -eq 0 ]; then
  echo "PASS: No drift detected."
else
  echo "FAIL: Security drift detected in safe-local-model-exec module."
fi

exit "$fail"
