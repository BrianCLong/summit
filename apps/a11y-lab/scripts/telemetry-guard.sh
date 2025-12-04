#!/usr/bin/env bash
set -euo pipefail

if [[ "${A11Y_LAB_ALLOW_ANALYTICS:-false}" != "false" ]]; then
  echo "Analytics must remain disabled for the a11y lab runtime"
  exit 1
fi

echo "Telemetry guard ✅ analytics blocked"
