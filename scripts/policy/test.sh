#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
POLICY_DIR="$ROOT_DIR/policy/pilot"
INPUT_PATH="${1:-$POLICY_DIR/input.example.json}"
OPA_VERSION="${OPA_VERSION:-0.67.1}"
OPA_BIN="${OPA_BIN:-$ROOT_DIR/policy/bin/opa}"
ENFORCE="${OPA_ENFORCE:-false}"

mkdir -p "$(dirname "$OPA_BIN")"

use_opa_binary() {
  local candidate="$1"
  command -v "$candidate" >/dev/null 2>&1
}

ensure_opa() {
  if use_opa_binary "$OPA_BIN"; then
    return 0
  fi

  if use_opa_binary opa; then
    OPA_BIN="$(command -v opa)"
    return 0
  fi

  echo "OPA binary not found; attempting download to $OPA_BIN" >&2
  if curl -fsSL "https://openpolicyagent.org/downloads/v${OPA_VERSION}/opa_linux_amd64_static" -o "$OPA_BIN"; then
    chmod +x "$OPA_BIN"
    return 0
  fi

  echo "Failed to download OPA. Set OPA_BIN to an existing binary or ensure network access." >&2
  return 1
}

run_with_builtin() {
  python - "$INPUT_PATH" <<'PYCODE'
import json, sys

def deny_messages(payload: dict) -> list[str]:
    messages = []
    iam = payload.get("iam", {})
    k8s = payload.get("k8s", {})
    if iam.get("wildcard_actions") is True:
        messages.append("Deny wildcard IAM actions")
    if k8s.get("privileged_pod") is True:
        messages.append("Deny privileged pods")
    return messages

def expect(condition: bool, message: str):
    if not condition:
        sys.stderr.write(message + "\n")
        sys.exit(1)

safe = {"iam": {"wildcard_actions": False}, "k8s": {"privileged_pod": False}}
wildcard = {"iam": {"wildcard_actions": True}, "k8s": {"privileged_pod": False}}
privileged = {"iam": {"wildcard_actions": False}, "k8s": {"privileged_pod": True}}

expect(len(deny_messages(safe)) == 0, "Safe input unexpectedly denied")
expect(len(deny_messages(wildcard)) == 1, "Wildcard IAM should be denied")
expect(len(deny_messages(privileged)) == 1, "Privileged pod should be denied")

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    payload = json.load(fh)

denies = deny_messages(payload)
print(len(denies))
PYCODE
}

if [[ ! -f "$INPUT_PATH" ]]; then
  echo "Input file not found: $INPUT_PATH" >&2
  exit 1
fi

DENY_COUNT=""

if ensure_opa; then
  pushd "$POLICY_DIR" >/dev/null
  "$OPA_BIN" test . -v
  DENY_COUNT=$("$OPA_BIN" eval -f json -d . 'data.policy.export.deny' --input "$INPUT_PATH" | jq '.result[0].expressions[0].value | length')
  popd >/dev/null
else
  echo "OPA unavailable; using built-in evaluator for pilot gate" >&2
  DENY_COUNT=$(run_with_builtin)
fi

echo "OPA deny count: $DENY_COUNT"

if [[ "$ENFORCE" == "true" && "$DENY_COUNT" -gt 0 ]]; then
  echo "OPA enforcement enabled and denies present" >&2
  exit 1
fi
