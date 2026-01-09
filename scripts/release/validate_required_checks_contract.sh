#!/usr/bin/env bash
# validate_required_checks_contract.sh
# Validates the required checks contract against policy and workflows.
#
# Usage:
#   ./scripts/release/validate_required_checks_contract.sh
#
# Exit codes:
#   0 - Contract matches policy, is sorted, and exists in workflows
#   1 - Validation failure
#
# Authority: docs/release/REQUIRED_CHECKS_CONTRACT.md

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
CONTRACT_FILE="${REPO_ROOT}/docs/release/REQUIRED_CHECKS_CONTRACT.md"
POLICY_FILE="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.yml"
WORKFLOWS_DIR="${REPO_ROOT}/.github/workflows"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_error() {
    echo "[ERROR] $*" >&2
}

extract_contract_checks() {
    awk '
        /<!-- CONTRACT:START -->/ {in_contract=1; next}
        /<!-- CONTRACT:END -->/ {in_contract=0}
        in_contract && /^  - / {
            line=$0
            sub(/^  - /, "", line)
            gsub(/"/, "", line)
            gsub(/\r/, "", line)
            print line
        }
    ' "$CONTRACT_FILE"
}

extract_workflow_contexts() {
    local file
    find "$WORKFLOWS_DIR" -maxdepth 1 -type f -name "*.yml" -print0 | while IFS= read -r -d '' file; do
        awk -v file="$file" '
            function trim_name(value) {
                gsub(/^["'\'']|["'\'']$/, "", value)
                sub(/[[:space:]]+#.*/, "", value)
                return value
            }
            function flush_job() {
                if (job_id != "") {
                    name = job_name != "" ? job_name : job_id
                    name = trim_name(name)
                    if (workflow != "" && name != "") {
                        print workflow " / " name
                    }
                }
                job_id = ""
                job_name = ""
            }
            /^[^[:space:]]/ {
                if ($1 == "name:") {
                    workflow = substr($0, index($0, $2))
                    workflow = trim_name(workflow)
                }
            }
            /^jobs:/ { in_jobs = 1; next }
            in_jobs && /^[^ ]/ { in_jobs = 0; flush_job(); next }
            in_jobs && /^  [A-Za-z0-9_.-]+:/ {
                flush_job()
                job_id = $1
                sub(/:$/, "", job_id)
                next
            }
            in_jobs && /^    name:/ {
                job_name = substr($0, index($0, $2))
                job_name = trim_name(job_name)
            }
            END { flush_job() }
        ' "$file"
    done
}

main() {
    if [[ ! -f "$CONTRACT_FILE" ]]; then
        log_error "Contract file not found: $CONTRACT_FILE"
        exit 1
    fi
    if [[ ! -f "$POLICY_FILE" ]]; then
        log_error "Policy file not found: $POLICY_FILE"
        exit 1
    fi
    if [[ ! -d "$WORKFLOWS_DIR" ]]; then
        log_error "Workflows directory not found: $WORKFLOWS_DIR"
        exit 1
    fi

    CONTRACT_CHECKS_RAW=$(extract_contract_checks)
    CONTRACT_CHECKS_SORTED=$(echo "$CONTRACT_CHECKS_RAW" | sort)

    if [[ "$CONTRACT_CHECKS_RAW" != "$CONTRACT_CHECKS_SORTED" ]]; then
        log_error "Contract checks are not sorted. Sort the list for deterministic diffs."
        diff -u <(echo "$CONTRACT_CHECKS_RAW") <(echo "$CONTRACT_CHECKS_SORTED") || true
        exit 1
    fi

    POLICY_CHECKS=$("${SCRIPT_DIR}/extract_required_checks_from_policy.sh" \
        --policy "$POLICY_FILE" | jq -r '.always_required[]' | sort)

    if ! diff -u <(echo "$CONTRACT_CHECKS_SORTED") <(echo "$POLICY_CHECKS") >/dev/null; then
        log_error "Contract checks do not match policy always_required list."
        diff -u <(echo "$CONTRACT_CHECKS_SORTED") <(echo "$POLICY_CHECKS") || true
        exit 1
    fi

    WORKFLOW_CONTEXTS=$(extract_workflow_contexts | sort -u)
    MISSING_IN_WORKFLOWS=()
    while IFS= read -r check; do
        [[ -z "$check" ]] && continue
        if ! echo "$WORKFLOW_CONTEXTS" | grep -Fxq "$check"; then
            MISSING_IN_WORKFLOWS+=("$check")
        fi
    done <<< "$CONTRACT_CHECKS_SORTED"

    if [[ ${#MISSING_IN_WORKFLOWS[@]} -gt 0 ]]; then
        log_error "Contract checks missing in workflows:"
        for check in "${MISSING_IN_WORKFLOWS[@]}"; do
            echo " - $check" >&2
        done
        exit 1
    fi

    echo "Contract validation passed."
}

main "$@"
