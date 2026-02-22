#!/usr/bin/env bash
set -euo pipefail
TARGET=${TARGET:-http://localhost:4000}

# Try to find k6
K6_BIN=$(command -v k6 || true)
if [ -z "$K6_BIN" ]; then
    if [ -f "./k6-v0.47.0-linux-amd64/k6" ]; then
        K6_BIN="./k6-v0.47.0-linux-amd64/k6"
    elif [ -f "../../k6-v0.47.0-linux-amd64/k6" ]; then
        # Handle case where script is run from ops/k6/
        K6_BIN="../../k6-v0.47.0-linux-amd64/k6"
    else
        echo "Error: k6 not found in PATH or ./k6-v0.47.0-linux-amd64/k6"
        exit 1
    fi
fi

echo "Running k6 smoke test against $TARGET using $K6_BIN..."
cat > /tmp/smoke.js <<'JS'
import http from 'k6/http'; import { check } from 'k6';
export default function(){
  const r=http.get(`${__ENV.TARGET}/health`);
  check(r,{ 'status is 200':(res)=>res.status===200 });
}
JS
$K6_BIN run -e TARGET=$TARGET - < /tmp/smoke.js
