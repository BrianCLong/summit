#!/usr/bin/env bash
set -Eeuo pipefail
# Optional policy hook invoked before any mutating action.
# Exit nonzero to block the action.
echo "[policy_gate] No custom policies defined; allowing action."
