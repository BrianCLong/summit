#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <bundle_path> <artifact_root>" >&2
  exit 1
fi

bundle_path="$1"
artifact_root="$2"

run_root_1="${artifact_root}/run1"
run_root_2="${artifact_root}/run2"

mkdir -p "${run_root_1}" "${run_root_2}"

report_path_1=$(python cli/intel_ingest.py "${bundle_path}" "${run_root_1}" --determinism-check --emit-report-path)
report_path_2=$(python cli/intel_ingest.py "${bundle_path}" "${run_root_2}" --determinism-check --emit-report-path)

if ! cmp -s "${report_path_1}" "${report_path_2}"; then
  echo "Determinism gate failed: report.json differs" >&2
  echo "Run 1: ${report_path_1}" >&2
  echo "Run 2: ${report_path_2}" >&2
  exit 1
fi

echo "Determinism gate passed: ${report_path_1}"
