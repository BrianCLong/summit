#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  cat <<'USAGE'
Summit Flywheel Setup (SFS) preflight

Usage: preflight.sh [--quiet] [--json] [--help]

This scaffolding version performs lightweight environment discovery and exits
successfully if the script can run. Full ACFS-style validations will be
implemented in a subsequent PR.
USAGE
}

QUIET=0
JSON=0

for arg in "$@"; do
  case "$arg" in
    --quiet)
      QUIET=1
      ;;
    --json)
      JSON=1
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    *)
      echo "[SFS] Warning: unrecognized argument '$arg' (ignored in scaffolding)." >&2
      ;;
  esac
done

OS_NAME="$(uname -s)"
ARCH_NAME="$(uname -m)"

if [[ "$JSON" -eq 1 ]]; then
  cat <<JSON
{
  "status": "ok",
  "message": "preflight scaffolding ready",
  "details": {
    "os": "${OS_NAME}",
    "arch": "${ARCH_NAME}",
    "note": "full validations pending future PR"
  }
}
JSON
else
  if [[ "$QUIET" -eq 0 ]]; then
    echo "[SFS] Preflight scaffolding ready (full checks coming in PR2)."
    echo "[SFS] Detected OS: ${OS_NAME}; Arch: ${ARCH_NAME}."
  fi
fi
