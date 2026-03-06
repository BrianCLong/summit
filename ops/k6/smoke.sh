#!/usr/bin/env bash
set -euo pipefail
cat > /tmp/smoke.js <<'JS'
import http from 'k6/http'; import { check } from 'k6';
export default function(){ const r=http.get(`${__ENV.TARGET}/healthz`); check(r,{ '200':(res)=>res.status===200 }); }
JS
k6 run - < /tmp/smoke.js
