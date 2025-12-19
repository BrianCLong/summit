#!/usr/bin/env bash
set -euo pipefail

BUDGET_FILE="${BUDGET_FILE:-.maestro/ci_budget.json}"
SBOM_GLOBS=(${SBOM_GLOBS:-"sbom.cdx.json" "sbom.spdx.json" "sbom.json"})
ATTESTATION_DIRS=(${ATTESTATION_PATHS:-"artifacts" "release" "dist"})

if [[ ! -f "${BUDGET_FILE}" ]]; then
  echo "Budget file ${BUDGET_FILE} not found" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

DEFAULT_CRITICAL=$(jq -r '.alerts.critical_threshold // 0.95' "${BUDGET_FILE}" 2>/dev/null || echo 0)
DEFAULT_HIGH=$(jq -r '.alerts.warning_threshold // 0.8' "${BUDGET_FILE}" 2>/dev/null || echo 0)
VULN_BUDGET_CRITICAL=${VULN_BUDGET_CRITICAL:-${DEFAULT_CRITICAL}}
VULN_BUDGET_HIGH=${VULN_BUDGET_HIGH:-${DEFAULT_HIGH}}

echo "🔒 Verifying provenance attestation and SBOM budgets"

attestation_found=false
for dir in "${ATTESTATION_DIRS[@]}"; do
  if [[ -d "${dir}" ]]; then
    if find "${dir}" -maxdepth 4 -type f \( -name "*provenance*" -o -name "*.intoto.json" -o -name "*.intoto.jsonl" -o -name "*attestation*" -o -name "*slsa*" \) | head -n 1 | grep -q .; then
      attestation_found=true
      break
    fi
  fi
done

if [[ "${attestation_found}" != true ]]; then
  echo "❌ No provenance or attestation artifacts found in ${ATTESTATION_DIRS[*]}" >&2
  exit 1
fi

# Locate an SBOM file
sbom_file=""
for pattern in "${SBOM_GLOBS[@]}"; do
  candidate=$(find . -maxdepth 5 -type f -name "${pattern}" | head -n 1 || true)
  if [[ -n "${candidate}" ]]; then
    sbom_file="${candidate}"
    break
  fi
done

if [[ -z "${sbom_file}" ]]; then
  echo "❌ No SBOM file found matching patterns: ${SBOM_GLOBS[*]}" >&2
  exit 1
fi

echo "Using SBOM: ${sbom_file}"

tmp_report=$(mktemp)
if command -v grype >/dev/null 2>&1; then
  grype "sbom:${sbom_file}" -o json > "${tmp_report}" || true
elif [[ -f "vulnerability-report.json" ]]; then
  cp vulnerability-report.json "${tmp_report}"
else
  echo "❌ Neither grype nor vulnerability-report.json is available for scanning" >&2
  exit 1
fi

critical=$(jq '[.matches[]?.vulnerability?.severity | select(.!=null and (. | ascii_downcase)=="critical")]|length' "${tmp_report}" 2>/dev/null || echo 0)
high=$(jq '[.matches[]?.vulnerability?.severity | select(.!=null and (. | ascii_downcase)=="high")]|length' "${tmp_report}" 2>/dev/null || echo 0)

if (( critical > VULN_BUDGET_CRITICAL )); then
  echo "❌ Critical vulnerability count ${critical} exceeds budget ${VULN_BUDGET_CRITICAL}" >&2
  exit 1
fi

if (( high > VULN_BUDGET_HIGH )); then
  echo "❌ High vulnerability count ${high} exceeds budget ${VULN_BUDGET_HIGH}" >&2
  exit 1
fi

echo "✅ Provenance and SBOM verification passed (critical=${critical}, high=${high})"
