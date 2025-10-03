#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "▶ IntelGraph Baseline Capture"
echo "   repo: $ROOT"
echo "   date: $(date -Is)"

# 1) Bring up minimal stack for smoke (best-effort)
make -f sprint/impl/Makefile run || true

# 2) Run harness once to produce metrics/*.jsonl and metrics.md
python3 sprint/experiments/harness/run.py --config sprint/experiments/configs.yaml || true

# 3) Write/refresh baseline.json using evaluator
export WRITE_BASELINE=1
python3 -m pip install pyyaml >/dev/null 2>&1 || true
python3 sprint/experiments/evaluate.py

if [[ -f sprint/benchmark/baseline.json ]]; then
  echo "✅ Baseline written: sprint/benchmark/baseline.json"
  jq . sprint/benchmark/baseline.json || true
else
  echo "❌ Baseline not produced"; exit 1
fi