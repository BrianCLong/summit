#!/usr/bin/env bash
set -euo pipefail

PUBLIC_EVIDENCE_DIR="${PUBLIC_EVIDENCE_DIR:-out/evidence/${GIT_SHA:-}}"
BADGE_PATH="${PUBLIC_EVIDENCE_DIR}/badge.json"
SUMMARY_PATH="${PUBLIC_EVIDENCE_DIR}/evidence.summary.json"

if [[ ! -f "${BADGE_PATH}" ]]; then
  echo "Missing ${BADGE_PATH}" >&2
  exit 1
fi

if [[ ! -f "${SUMMARY_PATH}" ]]; then
  echo "Missing ${SUMMARY_PATH}" >&2
  exit 1
fi

INPUT_FILE=$(mktemp)
python - <<'PY' "${BADGE_PATH}" "${SUMMARY_PATH}" "${INPUT_FILE}"
import json
import sys

badge_path, summary_path, output_path = sys.argv[1:4]
with open(badge_path, "r", encoding="utf-8") as handle:
    badge = json.load(handle)
with open(summary_path, "r", encoding="utf-8") as handle:
    summary = json.load(handle)

with open(output_path, "w", encoding="utf-8") as handle:
    json.dump({"badge": badge, "summary": summary}, handle)
PY

opa eval --fail-defined --format=pretty \
  --data policies/public_evidence_redaction.rego \
  --input "${INPUT_FILE}" \
  "data.public_evidence.redaction.allow"
