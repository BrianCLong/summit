#!/usr/bin/env bash
set -euo pipefail

ROOT=${ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}
EVIDENCE_DIR="${ROOT}/evidence-bundles/demo"
OUT_DIR="${EVIDENCE_DIR}/runtime"
BUNDLE_PATH="${EVIDENCE_DIR}/policy-dual-control-bundle.json"

log() {
  echo -e "\n[$(date -Iseconds)] $*"
}

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1" >&2
    exit 1
  fi
}

require git
require python3

mkdir -p "$OUT_DIR"

log "Preflight: generating request and validating JSON"
cat >"${OUT_DIR}/request.json" <<'EOF_REQUEST'
{
  "requestId": "POLICY-REQ-DEMO-001",
  "action": "enable-dual-control",
  "target": "graph/ingestion",
  "initiator": "analyst.alfa@example.com",
  "businessReason": "Pair-review enforcement for ingestion controls",
  "riskTier": "moderate",
  "requestedAt": "2026-01-11T00:00:00Z"
}
EOF_REQUEST
python3 -m json.tool "${OUT_DIR}/request.json" >/dev/null

log "Preflight: capturing repository context"
python3 - "${OUT_DIR}/preflight.json" "$ROOT" <<'PY'
import datetime
import hashlib
import json
import pathlib
import subprocess
import sys

target = pathlib.Path(sys.argv[1])
root = pathlib.Path(sys.argv[2])
root_path = root.resolve()


def git(args):
  return subprocess.check_output(["git", *args], cwd=root, text=True).strip()

def rel(path: pathlib.Path) -> str:
  try:
    return str(path.resolve().relative_to(root_path))
  except ValueError:
    return str(path)

request_path = target.parent.joinpath("request.json").resolve()
request_sha = hashlib.sha256(request_path.read_bytes()).hexdigest()

payload = {
  "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "git": {
    "commit": git(["rev-parse", "HEAD"]),
    "short": git(["rev-parse", "--short", "HEAD"]),
    "branch": git(["rev-parse", "--abbrev-ref", "HEAD"]),
  },
  "validations": {
    "json": "request.json validated with python -m json.tool",
    "schema": "demo schema check: required fields present",
  },
  "inputs": {
    "requestFile": rel(request_path),
    "requestSha256": request_sha,
  },
}
target.write_text(json.dumps(payload, indent=2))
print(f"Wrote {target}")
PY

log "Approvals: drafting dual-control signatures"
cat >"${OUT_DIR}/approvals.json" <<'EOF_APPROVALS'
{
  "requestId": "POLICY-REQ-DEMO-001",
  "approvals": [
    {
      "role": "Data Owner",
      "actor": "owner.bravo@example.com",
      "decision": "approve",
      "timestamp": "2026-01-11T01:15:00Z",
      "notes": "Validated scope and blast radius."
    },
    {
      "role": "Security",
      "actor": "sec.charlie@example.com",
      "decision": "approve",
      "timestamp": "2026-01-11T01:20:00Z",
      "notes": "Controls mapped to ABAC policy set."
    }
  ]
}
EOF_APPROVALS

log "Execution: simulating change rollout"
cat >"${OUT_DIR}/execution.json" <<'EOF_EXECUTION'
{
  "requestId": "POLICY-REQ-DEMO-001",
  "plan": [
    "OPA dry-run on sample events",
    "Deploy policy bundle to staging gatekeeper",
    "Monitor audit log for 5m",
    "Promote to production after zero regressions"
  ],
  "result": "success",
  "completedAt": "2026-01-11T01:45:00Z",
  "evidence": {
    "logs": "logs/policy-gatekeeper-2026-01-11T01-45-00Z.log",
    "export": "evidence-bundles/demo/policy-dual-control-bundle.json"
  }
}
EOF_EXECUTION

log "Receipt: exporting bundle with digests"
python3 - "$BUNDLE_PATH" "$OUT_DIR" <<'PY'
import datetime
import hashlib
import json
import pathlib
import sys

bundle_path = pathlib.Path(sys.argv[1])
out_dir = pathlib.Path(sys.argv[2])
root_path = bundle_path.parent.parent.parent.resolve()


def digest(path: pathlib.Path) -> str:
  return hashlib.sha256(path.read_bytes()).hexdigest()

def rel(path: pathlib.Path) -> str:
  try:
    return str(path.resolve().relative_to(root_path))
  except ValueError:
    return str(path)

files = ["request.json", "preflight.json", "approvals.json", "execution.json"]
artifacts = []
for name in files:
  path = out_dir / name
  artifacts.append(
    {
      "name": name,
      "path": rel(path),
      "sha256": digest(path),
    }
  )

bundle = {
  "version": "0.1.0-demo",
  "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "requestId": "POLICY-REQ-DEMO-001",
  "stages": {
    "preflight": json.loads((out_dir / "preflight.json").read_text()),
    "approvals": json.loads((out_dir / "approvals.json").read_text()),
    "execution": json.loads((out_dir / "execution.json").read_text()),
  },
  "artifacts": artifacts,
}
bundle_path.write_text(json.dumps(bundle, indent=2))
print(f"Bundle written to {bundle_path}")
PY

log "Done. Bundle ready at ${BUNDLE_PATH}"
