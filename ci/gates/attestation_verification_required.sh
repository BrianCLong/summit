#!/usr/bin/env bash
set -euo pipefail

SUMMARY_PATH="${SUMMARY_PATH:-out/evidence/${GIT_SHA:-}/evidence.summary.json}"

if [[ ! -f "${SUMMARY_PATH}" ]]; then
  echo "Missing ${SUMMARY_PATH}" >&2
  exit 1
fi

STATUS=$(python - <<'PY' "${SUMMARY_PATH}"
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    summary = json.load(handle)
print(summary.get("verification", {}).get("status", ""))
PY
)

if [[ "${STATUS}" != "verified" ]]; then
  echo "Attestation verification status is ${STATUS}." >&2
  exit 1
fi

printf "Attestation verification status is verified.\n"
