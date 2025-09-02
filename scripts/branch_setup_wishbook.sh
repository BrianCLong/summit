#!/usr/bin/env bash
set -euo pipefail

branches=(
  feature/graph-xai
  feature/prov-ledger
  feature/copilot-nl2cypher
  feature/policy-license
  feature/runbooks-r1-r5
  feature/otel-slos
  feature/stix-misp-stubs
)

for b in "${branches[@]}"; do
  git branch "$b" || true
done

echo "Created local branches: ${branches[*]}"

