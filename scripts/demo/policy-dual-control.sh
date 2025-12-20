#!/usr/bin/env bash
set -euo pipefail

# Demonstrates an end-to-end dual-control export policy check using the
# OPA policy defined in policy/opa/export_enhanced.rego.
#
# The script runs two evaluations:
#   1) A single-approver request that should be held because dual control
#      and step-up authentication are missing.
#   2) A dual-control request (two approvers + step-up) that should pass
#      with an "allow" decision and a dual-control requirement recorded in
#      the risk assessment.
#
# Outputs are written to .demo/policy-dual-control/ so repo files are not
# mutated. A static reference bundle lives at
# evidence-bundles/demo/policy-dual-control-bundle.json for comparison.

if ! command -v opa >/dev/null 2>&1; then
  echo "[error] opa CLI is required. Install from https://www.openpolicyagent.org/docs/latest/#running-opa." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[error] jq is required for JSON shaping (https://stedolan.github.io/jq/)." >&2
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"
WORKDIR="${ROOT}/.demo/policy-dual-control"
mkdir -p "${WORKDIR}"

INPUT_TEMPLATE="${ROOT}/evidence-bundles/demo/policy-dual-control-input.json"
SINGLE_INPUT="${WORKDIR}/request.single-approver.json"
DUAL_INPUT="${WORKDIR}/request.dual-control.json"

ROOT_DIR="${ROOT}" python - <<'PY'
import json
import os
from copy import deepcopy
from pathlib import Path

root = Path(os.environ["ROOT_DIR"])
base_path = root / "evidence-bundles/demo/policy-dual-control-input.json"
base = json.loads(base_path.read_text())

single = deepcopy(base)
single["context"]["approvals"] = ["compliance-officer"]
single["context"]["step_up_verified"] = False

dual = deepcopy(base)
# Dual control already present in the base template; keep step-up true.

def write(doc, path):
    Path(path).write_text(json.dumps(doc, indent=2))

write(single, Path(root / ".demo/policy-dual-control/request.single-approver.json"))
write(dual, Path(root / ".demo/policy-dual-control/request.dual-control.json"))
PY

OPA_DATA="${ROOT}/policy/opa/export_enhanced.rego"

run_eval() {
  local input="$1"
  local output="$2"
  opa eval --format=json -d "${OPA_DATA}" -i "${input}" \
    'data.intelgraph.policy.export.enhanced.decision' \
    | jq -r '.result[0].expressions[0].value' > "${output}"
}

run_eval "${SINGLE_INPUT}" "${WORKDIR}/decision.single.json"
run_eval "${DUAL_INPUT}" "${WORKDIR}/decision.dual.json"

print_summary() {
  local label="$1"
  local path="$2"
  echo "\n[${label}]" >&2
  jq '{action, allow, required_approvals, risk_assessment: {requires_dual_control: .risk_assessment.requires_dual_control, requires_step_up: .risk_assessment.requires_step_up, level: .risk_assessment.level}, next_steps}' "${path}" >&2
}

print_summary "single-approver (expected: hold for dual control/step-up)" "${WORKDIR}/decision.single.json"
print_summary "dual-control (expected: allow with dual control recorded)" "${WORKDIR}/decision.dual.json"

INPUT_SHA=$(sha256sum "${DUAL_INPUT}" | cut -d ' ' -f1)

jq -n \
  --arg scenario "policy-dual-control-demo" \
  --arg inputPath "${DUAL_INPUT}" \
  --arg inputSha "${INPUT_SHA}" \
  --arg policy "${OPA_DATA}" \
  --slurpfile single "${WORKDIR}/decision.single.json" \
  --slurpfile dual "${WORKDIR}/decision.dual.json" \
  '{scenario: $scenario, policy: $policy, input: {path: $inputPath, sha256: $inputSha}, evaluations: {single: $single[0], dual: $dual[0]}}' \
  > "${WORKDIR}/policy-dual-control-evidence.json"

echo "\n[evidence] wrote ${WORKDIR}/policy-dual-control-evidence.json"
echo "Reference sample: ${ROOT}/evidence-bundles/demo/policy-dual-control-bundle.json"
