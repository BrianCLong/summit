#!/usr/bin/env bash
set -euo pipefail

# RDP Master Gate Runner

if [[ "${SEC_RDP_ALL_DISABLED:-false}" == "true" ]]; then
  echo "skip: ALL RDP gates (master killswitch active)"
  exit 0
fi

FAILED=0

echo "--- Running RDP Security Gates ---"

./security/gates/gate_workflow_changes.sh || FAILED=1
./security/gates/gate_secret_leaks.sh || FAILED=1
./security/gates/gate_fork_actions_safety.sh || FAILED=1
python3 security/gates/gate_dependency_allowlist.py || FAILED=1

# Innovation Lane (Alert-only or Gated)
./security/agent/alap_enforcement.sh || true
./security/heuristics/suspicious_diff_scan.sh || true

if [ $FAILED -eq 1 ]; then
  echo "--- RDP Gates FAILED ---"
  exit 1
else
  echo "--- RDP Gates PASSED ---"
  exit 0
fi
