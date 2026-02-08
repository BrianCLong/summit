#!/usr/bin/env bash
set -euo pipefail

ARTIFACT=""
BUNDLE=""
TRUSTED_ROOT=""
SIGNING_CONFIG=""
EVIDENCE_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --artifact) ARTIFACT="$2"; shift 2;;
    --bundle) BUNDLE="$2"; shift 2;;
    --trusted-root) TRUSTED_ROOT="$2"; shift 2;;
    --signing-config) SIGNING_CONFIG="$2"; shift 2;;
    --evidence-id) EVIDENCE_ID="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

[[ -n "$ARTIFACT" && -n "$BUNDLE" && -n "$EVIDENCE_ID" ]] || { echo "missing required args" >&2; exit 2; }

# Construct args array properly
args=("verify-blob" "$ARTIFACT" "--bundle" "$BUNDLE")
[[ -n "$TRUSTED_ROOT" ]] && args+=("--trusted-root" "$TRUSTED_ROOT")
[[ -n "$SIGNING_CONFIG" ]] && args+=("--use-signing-config" "$SIGNING_CONFIG")

mkdir -p "evidence/$EVIDENCE_ID"

# Capture exit code
set +e
cosign "${args[@]}" >"evidence/$EVIDENCE_ID/cosign.stdout.txt" 2>"evidence/$EVIDENCE_ID/cosign.stderr.txt"
rc=$?
set -e

result="fail"; [[ $rc -eq 0 ]] && result="pass"

cat >"evidence/$EVIDENCE_ID/report.json" <<JSON
{"evidence_id":"$EVIDENCE_ID","subject":{"type":"blob","name":"$ARTIFACT"},"result":"$result","artifacts":[{"kind":"stdout","path":"evidence/$EVIDENCE_ID/cosign.stdout.txt"},{"kind":"stderr","path":"evidence/$EVIDENCE_ID/cosign.stderr.txt"}]}
JSON

cat >"evidence/$EVIDENCE_ID/metrics.json" <<JSON
{"evidence_id":"$EVIDENCE_ID","cosign_exit_code":$rc}
JSON

cat >"evidence/$EVIDENCE_ID/stamp.json" <<JSON
{"timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"}
JSON

exit $rc
