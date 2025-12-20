#!/usr/bin/env bash
set -euo pipefail

API_PORT="${API_PORT:-4000}"
GATEWAY_PORT="${GATEWAY_PORT:-4100}"

echo "== install =="
corepack enable
pnpm -v
if ! pnpm install --frozen-lockfile; then
  pnpm install
  pnpm install --lockfile-only
  pnpm install --frozen-lockfile
fi

echo "== checks =="
pnpm -w run lint
pnpm -w run typecheck || true
pnpm -w run build
pnpm -w run test

echo "== stack =="
make bootstrap
make up
bash scripts/wait-for-stack.sh

echo "== health/metrics =="
mkdir -p artifacts
{
  echo "== API =="
  curl -sSf "http://localhost:${API_PORT}/health"
  curl -sSf "http://localhost:${API_PORT}/health/detailed"
  curl -sSf "http://localhost:${API_PORT}/metrics" | head -n 40
  echo "== GATEWAY =="
  curl -sSf "http://localhost:${GATEWAY_PORT}/health"
  curl -sSf "http://localhost:${GATEWAY_PORT}/metrics" | head -n 40
} | tee artifacts/health-metrics.log

echo "== smoke =="
make smoke | tee artifacts/smoke.log

echo "== prod guardrail negative =="
set +e
NODE_ENV=production JWT_SECRET=changeme CORS_ORIGIN="*" pnpm --filter @summit/server start:prod
rc=$?
echo "server exit code: $rc" | tee artifacts/prod-guard.log
if [ "$rc" -eq 0 ]; then
  echo "Expected failure with weak prod config" | tee -a artifacts/prod-guard.log
  exit 1
else
  echo "PASS: refused weak prod config" | tee -a artifacts/prod-guard.log
fi
set -e

echo "== down =="
make down
