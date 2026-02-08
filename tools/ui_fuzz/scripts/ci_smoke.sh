#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${UI_FUZZ_BASE_URL:-http://localhost:3000}
ALLOWLIST=${UI_FUZZ_ALLOWLIST:-localhost}
SEED=${UI_FUZZ_SEED:-7331}
TIME_BUDGET_MS=${UI_FUZZ_TIME_BUDGET_MS:-240000}

npx tsx tools/ui_fuzz/src/index.ts \
  --base-url "$BASE_URL" \
  --allowlist "$ALLOWLIST" \
  --seed "$SEED" \
  --time-budget-ms "$TIME_BUDGET_MS" \
  --headless true \
  --exit-on-violation true
