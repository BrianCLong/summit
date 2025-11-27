#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <AlertName>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ALERT_NAME="$1"

python3 "$ROOT_DIR/runbooks/verify_remediation.py" "$ALERT_NAME"
