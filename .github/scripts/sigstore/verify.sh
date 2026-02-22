#!/usr/bin/env bash
set -euo pipefail

ARTIFACT=""
BUNDLE=""
TRUSTED_ROOT=""
SIGNING_CONFIG=""
EVIDENCE_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --artifact)
      ARTIFACT="$2"
      shift 2
      ;;
    --bundle)
      BUNDLE="$2"
      shift 2
      ;;
    --trusted-root)
      TRUSTED_ROOT="$2"
      shift 2
      ;;
    --signing-config)
      SIGNING_CONFIG="$2"
      shift 2
      ;;
    --evidence-id)
      EVIDENCE_ID="$2"
      shift 2
      ;;
    *)
      echo "unknown arg: $1" >&2
      exit 2
      ;;
  esac
  done

if [[ -z "$ARTIFACT" || -z "$BUNDLE" || -z "$EVIDENCE_ID" ]]; then
  echo "missing required args" >&2
  exit 2
fi

args=(verify-blob "$ARTIFACT" --bundle "$BUNDLE")
[[ -n "$TRUSTED_ROOT" ]] && args+=(--trusted-root "$TRUSTED_ROOT")
[[ -n "$SIGNING_CONFIG" ]] && args+=(--use-signing-config "$SIGNING_CONFIG")

output_dir="evidence/$EVIDENCE_ID"
mkdir -p "$output_dir"

set +e
cosign "${args[@]}" >"$output_dir/cosign.stdout.txt" 2>"$output_dir/cosign.stderr.txt"
rc=$?
set -e

result="fail"
if [[ $rc -eq 0 ]]; then
  result="pass"
fi

cat >"$output_dir/report.json" <<JSON
{
  "evidence_id": "$EVIDENCE_ID",
  "subject": {
    "type": "blob",
    "name": "$ARTIFACT"
  },
  "result": "$result",
  "artifacts": [
    {
      "kind": "stdout",
      "path": "$output_dir/cosign.stdout.txt"
    },
    {
      "kind": "stderr",
      "path": "$output_dir/cosign.stderr.txt"
    }
  ]
}
JSON

cat >"$output_dir/metrics.json" <<JSON
{
  "evidence_id": "$EVIDENCE_ID",
  "cosign_exit_code": $rc
}
JSON

cat >"$output_dir/stamp.json" <<JSON
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

exit $rc
