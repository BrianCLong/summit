#!/usr/bin/env bash
# OPA Policy Simulation Script for IntelGraph
# Usage: ./scripts/opa-policy-sim.sh [test|sim|bench|trace]
set -euo pipefail

POLICY_DIR="policy/intelgraph"
EXAMPLES_DIR="policy/intelgraph-examples"

usage() {
  cat <<EOF
IntelGraph OPA Policy Simulation Tool

Usage: $0 <command> [options]

Commands:
  test              Run all OPA tests (opa test -v)
  sim <input.json>  Evaluate policy against input JSON
  bench             Benchmark policy evaluation latency
  trace <input.json> Run policy with full trace (debug)
  coverage          Run tests with coverage report

Examples:
  $0 test
  $0 sim policy/intelgraph-examples/tenant-allow.json
  $0 trace policy/intelgraph-examples/tenant-deny-cross.json
  $0 bench
  $0 coverage
EOF
}

cmd_test() {
  echo "=== Running OPA tests ==="
  opa test "$POLICY_DIR/" -v
  echo ""
  echo "=== All tests passed ==="
}

cmd_sim() {
  local input="${1:-}"
  if [ -z "$input" ]; then
    echo "Error: input JSON required. Usage: $0 sim <input.json>"
    exit 1
  fi

  echo "=== Policy Simulation ==="
  echo "Input: $input"
  echo ""

  echo "--- Tenant Isolation ---"
  opa eval --data "$POLICY_DIR/" --input "$input" \
    'data.intelgraph.tenant.decision' --format pretty 2>/dev/null || echo "(not applicable)"
  echo ""

  echo "--- RBAC ---"
  opa eval --data "$POLICY_DIR/" --input "$input" \
    'data.intelgraph.rbac.decision' --format pretty 2>/dev/null || echo "(not applicable)"
  echo ""

  echo "--- Purpose-Based Access ---"
  opa eval --data "$POLICY_DIR/" --input "$input" \
    'data.intelgraph.purpose.decision' --format pretty 2>/dev/null || echo "(not applicable)"
  echo ""

  echo "--- OIDC Claims ---"
  opa eval --data "$POLICY_DIR/" --input "$input" \
    'data.intelgraph.oidc.decision' --format pretty 2>/dev/null || echo "(not applicable)"
  echo ""

  echo "--- Retention ---"
  opa eval --data "$POLICY_DIR/" --input "$input" \
    'data.intelgraph.retention.decision' --format pretty 2>/dev/null || echo "(not applicable)"
  echo ""

  echo "--- Privacy ---"
  opa eval --data "$POLICY_DIR/" --input "$input" \
    'data.intelgraph.privacy.decision' --format pretty 2>/dev/null || echo "(not applicable)"
}

cmd_bench() {
  echo "=== Policy Benchmark ==="
  echo "Target: p95 < 10ms"
  echo ""

  local input="$EXAMPLES_DIR/tenant-allow.json"
  if [ ! -f "$input" ]; then
    echo "Error: example input not found at $input"
    exit 1
  fi

  echo "--- Tenant Isolation ---"
  opa bench --data "$POLICY_DIR/" --input "$input" \
    'data.intelgraph.tenant.allow' --count 1000 2>&1 || true
  echo ""

  echo "--- RBAC ---"
  opa bench --data "$POLICY_DIR/" --input "$input" \
    'data.intelgraph.rbac.allow' --count 1000 2>&1 || true
  echo ""

  echo "--- Purpose ---"
  opa bench --data "$POLICY_DIR/" --input "$input" \
    'data.intelgraph.purpose.allow' --count 1000 2>&1 || true
}

cmd_trace() {
  local input="${1:-}"
  if [ -z "$input" ]; then
    echo "Error: input JSON required. Usage: $0 trace <input.json>"
    exit 1
  fi

  echo "=== Policy Trace (full) ==="
  echo "Input: $input"
  echo ""

  opa eval --data "$POLICY_DIR/" --input "$input" \
    --explain=full --format pretty \
    '{tenant: data.intelgraph.tenant.decision, rbac: data.intelgraph.rbac.decision, purpose: data.intelgraph.purpose.decision}'
}

cmd_coverage() {
  echo "=== OPA Test Coverage ==="
  opa test "$POLICY_DIR/" -v --coverage --format json 2>/dev/null | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Coverage: {d.get(\"coverage\", 0):.1f}%')" 2>/dev/null || \
    opa test "$POLICY_DIR/" -v --coverage
}

case "${1:-}" in
  test)     cmd_test ;;
  sim)      cmd_sim "${2:-}" ;;
  bench)    cmd_bench ;;
  trace)    cmd_trace "${2:-}" ;;
  coverage) cmd_coverage ;;
  *)        usage ;;
esac
