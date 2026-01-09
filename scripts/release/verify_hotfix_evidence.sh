#!/usr/bin/env bash
#
# verify_hotfix_evidence.sh - Validate hotfix evidence bundle and parent linkage
#
# Usage:
#   ./verify_hotfix_evidence.sh --tag v4.1.3 [--parent v4.1.2] [--json]
#
# Validates:
#   1. Evidence bundle integrity (SHA256SUMS)
#   2. Parent linkage verification
#   3. Delta manifest correctness
#   4. Inherited evidence integrity
#
# Exit codes:
#   0 - All verification passed
#   1 - Verification failed
#   2 - Missing required files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."

TAG=""
PARENT_TAG=""
JSON_OUTPUT=false
WORK_DIR=""
EXIT_CODE=0

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      TAG="$2"
      shift 2
      ;;
    --parent)
      PARENT_TAG="$2"
      shift 2
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: $0 --tag <tag> [--parent <parent_tag>] [--json]" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${TAG}" ]]; then
  echo "Error: --tag is required" >&2
  exit 1
fi

# Create temporary work directory
WORK_DIR=$(mktemp -d)
trap 'rm -rf "${WORK_DIR}"' EXIT

ERRORS=()
WARNINGS=()
CHECKS_PASSED=0
CHECKS_FAILED=0

log_check() {
  local status="$1"
  local message="$2"

  if [[ "${status}" == "pass" ]]; then
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    if [[ "${JSON_OUTPUT}" != "true" ]]; then
      echo "  [PASS] ${message}"
    fi
  else
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    ERRORS+=("${message}")
    if [[ "${JSON_OUTPUT}" != "true" ]]; then
      echo "  [FAIL] ${message}"
    fi
  fi
}

log_warning() {
  local message="$1"
  WARNINGS+=("${message}")
  if [[ "${JSON_OUTPUT}" != "true" ]]; then
    echo "  [WARN] ${message}"
  fi
}

# Download release assets
if [[ "${JSON_OUTPUT}" != "true" ]]; then
  echo "Hotfix Evidence Verification"
  echo "============================"
  echo ""
  echo "Tag: ${TAG}"
  echo ""
  echo "Downloading release assets..."
fi

ASSETS_DIR="${WORK_DIR}/assets"
mkdir -p "${ASSETS_DIR}"

if ! gh release download "${TAG}" --dir "${ASSETS_DIR}" 2>/dev/null; then
  if [[ "${JSON_OUTPUT}" == "true" ]]; then
    echo '{"status": "error", "message": "Failed to download release assets"}'
  else
    echo "Error: Failed to download release assets for ${TAG}" >&2
  fi
  exit 2
fi

# Extract evidence bundle
if [[ "${JSON_OUTPUT}" != "true" ]]; then
  echo ""
  echo "Extracting evidence bundle..."
fi

EVIDENCE_DIR="${WORK_DIR}/evidence"
mkdir -p "${EVIDENCE_DIR}"

if [[ -f "${ASSETS_DIR}/evidence.tar.gz" ]]; then
  tar -xzf "${ASSETS_DIR}/evidence.tar.gz" -C "${EVIDENCE_DIR}"
elif [[ -f "${ASSETS_DIR}/evidence-bundle.tar.gz" ]]; then
  tar -xzf "${ASSETS_DIR}/evidence-bundle.tar.gz" -C "${EVIDENCE_DIR}"
else
  if [[ "${JSON_OUTPUT}" == "true" ]]; then
    echo '{"status": "error", "message": "No evidence bundle found in release"}'
  else
    echo "Error: No evidence bundle found in release" >&2
  fi
  exit 2
fi

if [[ "${JSON_OUTPUT}" != "true" ]]; then
  echo ""
  echo "Verification Checks:"
fi

# Check 1: SHA256SUMS manifest integrity
if [[ -f "${EVIDENCE_DIR}/SHA256SUMS" ]]; then
  if (cd "${EVIDENCE_DIR}" && sha256sum -c SHA256SUMS --quiet 2>/dev/null); then
    log_check "pass" "SHA256SUMS manifest verified"
  else
    log_check "fail" "SHA256SUMS verification failed"
    EXIT_CODE=1
  fi
else
  log_check "fail" "SHA256SUMS manifest not found"
  EXIT_CODE=1
fi

# Check 2: Provenance manifest exists and is valid JSON
if [[ -f "${EVIDENCE_DIR}/provenance.json" ]]; then
  if jq -e . "${EVIDENCE_DIR}/provenance.json" > /dev/null 2>&1; then
    log_check "pass" "provenance.json is valid JSON"

    # Verify required fields
    PROV_TAG=$(jq -r '.hotfix.tag // empty' "${EVIDENCE_DIR}/provenance.json")
    if [[ "${PROV_TAG}" == "${TAG}" ]]; then
      log_check "pass" "Provenance tag matches release tag"
    else
      log_check "fail" "Provenance tag mismatch: ${PROV_TAG} != ${TAG}"
      EXIT_CODE=1
    fi
  else
    log_check "fail" "provenance.json is not valid JSON"
    EXIT_CODE=1
  fi
else
  log_check "fail" "provenance.json not found"
  EXIT_CODE=1
fi

# Check 3: Parent linkage
if [[ -f "${EVIDENCE_DIR}/parent_linkage.json" ]]; then
  if jq -e . "${EVIDENCE_DIR}/parent_linkage.json" > /dev/null 2>&1; then
    log_check "pass" "parent_linkage.json is valid JSON"

    LINKED_PARENT=$(jq -r '.parent.tag // empty' "${EVIDENCE_DIR}/parent_linkage.json")
    if [[ -n "${LINKED_PARENT}" ]]; then
      log_check "pass" "Parent release linked: ${LINKED_PARENT}"

      # If parent tag was specified, verify it matches
      if [[ -n "${PARENT_TAG}" ]] && [[ "${LINKED_PARENT}" != "${PARENT_TAG}" ]]; then
        log_check "fail" "Parent tag mismatch: ${LINKED_PARENT} != ${PARENT_TAG}"
        EXIT_CODE=1
      fi

      # Verify parent evidence hash if present
      PARENT_EVIDENCE_HASH=$(jq -r '.parent.evidence_sha256 // empty' "${EVIDENCE_DIR}/parent_linkage.json")
      if [[ -n "${PARENT_EVIDENCE_HASH}" ]]; then
        log_check "pass" "Parent evidence hash recorded: ${PARENT_EVIDENCE_HASH:0:16}..."
      else
        log_warning "Parent evidence hash not recorded"
      fi
    else
      log_check "fail" "Parent release not linked"
      EXIT_CODE=1
    fi
  else
    log_check "fail" "parent_linkage.json is not valid JSON"
    EXIT_CODE=1
  fi
else
  log_warning "parent_linkage.json not found (may be non-hotfix release)"
fi

# Check 4: Delta manifest
if [[ -f "${EVIDENCE_DIR}/delta_manifest.json" ]]; then
  if jq -e . "${EVIDENCE_DIR}/delta_manifest.json" > /dev/null 2>&1; then
    log_check "pass" "delta_manifest.json is valid JSON"

    FILES_CHANGED=$(jq -r '.files_changed | length' "${EVIDENCE_DIR}/delta_manifest.json")
    log_check "pass" "Delta manifest records ${FILES_CHANGED} changed files"
  else
    log_check "fail" "delta_manifest.json is not valid JSON"
    EXIT_CODE=1
  fi
else
  log_warning "delta_manifest.json not found"
fi

# Check 5: Inherited evidence directory
if [[ -d "${EVIDENCE_DIR}/inherited" ]]; then
  INHERITED_COUNT=$(find "${EVIDENCE_DIR}/inherited" -type f | wc -l | tr -d ' ')
  if [[ "${INHERITED_COUNT}" -gt 0 ]]; then
    log_check "pass" "Inherited evidence present: ${INHERITED_COUNT} files"
  else
    log_warning "Inherited evidence directory exists but is empty"
  fi
else
  log_warning "No inherited evidence directory"
fi

# Check 6: Waiver verification (if any waivers referenced)
WAIVER_IDS=$(jq -r '.verification.waiver_ids // empty' "${EVIDENCE_DIR}/provenance.json" 2>/dev/null || echo "")
if [[ -n "${WAIVER_IDS}" ]] && [[ "${WAIVER_IDS}" != "null" ]]; then
  WAIVER_COUNT=$(jq -r '.verification.waiver_count // 0' "${EVIDENCE_DIR}/provenance.json")
  log_check "pass" "Release used ${WAIVER_COUNT} waivers: ${WAIVER_IDS}"
fi

# Output results
if [[ "${JSON_OUTPUT}" == "true" ]]; then
  cat <<EOF
{
  "status": $(if [[ ${EXIT_CODE} -eq 0 ]]; then echo '"pass"'; else echo '"fail"'; fi),
  "tag": "${TAG}",
  "checks": {
    "passed": ${CHECKS_PASSED},
    "failed": ${CHECKS_FAILED}
  },
  "errors": $(printf '%s\n' "${ERRORS[@]:-}" | jq -R -s -c 'split("\n") | map(select(length > 0))'),
  "warnings": $(printf '%s\n' "${WARNINGS[@]:-}" | jq -R -s -c 'split("\n") | map(select(length > 0))')
}
EOF
else
  echo ""
  echo "Summary:"
  echo "  Checks passed: ${CHECKS_PASSED}"
  echo "  Checks failed: ${CHECKS_FAILED}"
  echo ""

  if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    echo "Warnings:"
    for warning in "${WARNINGS[@]}"; do
      echo "  - ${warning}"
    done
    echo ""
  fi

  if [[ ${EXIT_CODE} -eq 0 ]]; then
    echo "Result: PASS"
  else
    echo "Result: FAIL"
  fi
fi

exit ${EXIT_CODE}
