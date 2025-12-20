#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")" && pwd)
INPUT="$ROOT/sample_inputs/signer.json"

if ! command -v opa >/dev/null 2>&1; then
  echo "opa binary not found; skipping signer simulation" >&2
  exit 0
fi

opa eval --format=pretty --data "$ROOT/signer.rego" --input "$INPUT" 'data.policy.signer'
