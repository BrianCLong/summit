#!/usr/bin/env bash
set -euo pipefail
if [[ "${SUMMIT_EVIDENCE_ENFORCE:-0}" == "1" ]]; then
  python -m summit.evidence.validate
else
  echo "[skip] evidence enforcement disabled"
fi
