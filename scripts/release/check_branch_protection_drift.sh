#!/usr/bin/env bash
# check_branch_protection_drift.sh
# Detects drift between REQUIRED_CHECKS_POLICY.yml and GitHub branch protection
#
# Compares policy's always-required checks with GitHub's required status checks
# and reports any mismatches.
#
# Usage:
#   ./scripts/release/check_branch_protection_drift.sh --branch main
#   ./scripts/release/check_branch_protection_drift.sh --repo owner/repo --branch main
#
# Exit codes:
#   0 - Always (advisory mode)
# Outputs drift_detected: true|false in JSON report
#
# Authority: docs/ci/BRANCH_PROTECTION_DRIFT.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Defaults
REPO=""
BRANCH="main"
POLICY_FILE="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.yml"
EXCEPTIONS_FILE="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml"
OUT_DIR="artifacts/release-train"
VERBOSE=false
FAIL_ON_DRIFT=false

usage() {
    cat << 'EOF'
Usage: check_branch_protection_drift.sh [OPTIONS]

Detect drift between REQUIRED_CHECKS_POLICY.yml and GitHub branch protection.

Options:
  --repo OWNER/REPO   GitHub repository (default: inferred from git remote)
  --branch BRANCH     Branch to check (default: main)
  --policy FILE       Policy file path (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)
  --exceptions FILE   Exceptions file path (default: docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml)
  --out-dir DIR       Output directory (default: artifacts/release-train)
  --fail-on-drift     Exit with code 1 if drift is detected
  --verbose           Enable verbose logging
  --help              Show this help

Outputs:
  - branch_protection_drift_report.md
  - branch_protection_drift_report.json

Exit Code:
  Always 0 (advisory mode). Check drift_detected in JSON output.
EOF
    exit 0
}

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[drift-check] $*" >&2
    fi
}

log_info() {
    echo "[INFO] $*" >&2
}

log_warn() {
    echo "[WARN] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo)
            REPO="$2"
            shift 2
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --policy)
            POLICY_FILE="$2"
            shift 2
            ;;
        --exceptions)
            EXCEPTIONS_FILE="$2"
            shift 2
            ;;
        --out-dir)
            OUT_DIR="$2"
            shift 2
            ;;
        --fail-on-drift)
            FAIL_ON_DRIFT=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Infer repo if not provided
if [[ -z "$REPO" ]]; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
    if [[ "$REMOTE_URL" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
        REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
    else
        log_error "Could not infer repository. Use --repo owner/repo"
        exit 1
    fi
fi

log "Repository: $REPO"
log "Branch: $BRANCH"
log "Policy: $POLICY_FILE"

mkdir -p "$OUT_DIR"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# --- Step 1: Extract policy requirements ---
log "Extracting always-required checks from policy..."

if [[ ! -f "$POLICY_FILE" ]]; then
    log_error "Policy file not found: $POLICY_FILE"
    exit 1
fi

POLICY_JSON=$("${SCRIPT_DIR}/extract_required_checks_from_policy.sh" \
    --policy "$POLICY_FILE" \
    ${VERBOSE:+--verbose})

POLICY_CHECKS=$(echo "$POLICY_JSON" | jq -r '.always_required[]' | sort)
POLICY_VERSION=$(echo "$POLICY_JSON" | jq -r '.policy_version')
POLICY_COUNT=$(echo "$POLICY_JSON" | jq -r '.count')

log "Policy version: $POLICY_VERSION"
log "Policy requires $POLICY_COUNT always-required checks"

# --- Step 2: Load exceptions ---
EXCEPTIONS_LOADED=false
EXCEPTION_ALLOW_MISSING=()
EXCEPTION_ALLOW_EXTRA=()
EXCEPTION_COUNT=0

if [[ -f "$EXCEPTIONS_FILE" ]]; then
    log "Loading exceptions from: $EXCEPTIONS_FILE"

    if command -v yq &> /dev/null; then
        NOW_DATE=$(date -u +"%Y-%m-%d")

        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            ID=$(echo "$line" | cut -d'|' -f1)
            CHECK=$(echo "$line" | cut -d'|' -f2)
            DIRECTION=$(echo "$line" | cut -d'|' -f3)
            EXPIRES=$(echo "$line" | cut -d'|' -f4)
            EXC_BRANCH=$(echo "$line" | cut -d'|' -f5)

            # Check if exception is for this branch
            if [[ "$EXC_BRANCH" != "$BRANCH" && "$EXC_BRANCH" != "*" ]]; then
                log "Exception $ID: Not for branch $BRANCH (applies to $EXC_BRANCH)"
                continue
            fi

            # Check if expired
            if [[ "$EXPIRES" < "$NOW_DATE" ]]; then
                log_warn "Exception $ID: EXPIRED on $EXPIRES - not applying"
                continue
            fi

            ((EXCEPTION_COUNT++))

            if [[ "$DIRECTION" == "allow_missing_in_github" ]]; then
                EXCEPTION_ALLOW_MISSING+=("$CHECK")
                log "Exception $ID: Allow '$CHECK' missing in GitHub (expires: $EXPIRES)"
            elif [[ "$DIRECTION" == "allow_extra_in_github" ]]; then
                EXCEPTION_ALLOW_EXTRA+=("$CHECK")
                log "Exception $ID: Allow '$CHECK' extra in GitHub (expires: $EXPIRES)"
            fi
        done < <(yq -r '.exceptions[]? | "\(.id)|\(.check_name)|\(.direction)|\(.expires_at)|\(.branch)"' "$EXCEPTIONS_FILE" 2>/dev/null || echo "")

        EXCEPTIONS_LOADED=true
        log "Loaded $EXCEPTION_COUNT active exceptions"
    else
        log_warn "yq not available - exceptions not loaded"
    fi
else
    log "No exceptions file found at $EXCEPTIONS_FILE"
fi

# --- Step 3: Query GitHub branch protection ---
log "Querying GitHub branch protection for $BRANCH..."

API_ENDPOINT="repos/${REPO}/branches/${BRANCH}/protection/required_status_checks"
API_ERROR=""
GITHUB_CHECKS=""
GITHUB_COUNT=0
API_ACCESSIBLE=true

# Try to fetch branch protection
set +e
API_RESPONSE=$(gh api "$API_ENDPOINT" 2>&1)
API_EXIT_CODE=$?
set -e

if [[ $API_EXIT_CODE -ne 0 ]]; then
    API_ACCESSIBLE=false

    if echo "$API_RESPONSE" | grep -q "404"; then
        API_ERROR="Branch protection not configured for $BRANCH"
        log_warn "$API_ERROR"
    elif echo "$API_RESPONSE" | grep -q "403"; then
        API_ERROR="Insufficient permissions to read branch protection (requires admin or read:org scope)"
        log_warn "$API_ERROR"
    else
        API_ERROR="API error: $API_RESPONSE"
        log_warn "$API_ERROR"
    fi
else
    # Extract required contexts (check names)
    GITHUB_CHECKS=$(echo "$API_RESPONSE" | jq -r '.contexts[]? // empty' 2>/dev/null | sort || echo "")

    # Also try the newer 'checks' array format
    if [[ -z "$GITHUB_CHECKS" ]]; then
        GITHUB_CHECKS=$(echo "$API_RESPONSE" | jq -r '.checks[]?.context // empty' 2>/dev/null | sort || echo "")
    fi

    GITHUB_COUNT=$(echo "$GITHUB_CHECKS" | grep -c . || echo 0)
    log "GitHub requires $GITHUB_COUNT status checks"
fi

# --- Step 4: Compare sets ---
DRIFT_DETECTED=false
MISSING_IN_GITHUB=()
EXTRA_IN_GITHUB=()
EXCEPTED_MISSING=()
EXCEPTED_EXTRA=()

if [[ "$API_ACCESSIBLE" == "true" ]]; then
    # Find checks in policy but not in GitHub
    while IFS= read -r check; do
        [[ -z "$check" ]] && continue
        if ! echo "$GITHUB_CHECKS" | grep -Fxq "$check"; then
            # Check if excepted
            if printf '%s\n' "${EXCEPTION_ALLOW_MISSING[@]}" 2>/dev/null | grep -Fxq "$check"; then
                EXCEPTED_MISSING+=("$check")
                log "Missing check '$check' is excepted"
            else
                MISSING_IN_GITHUB+=("$check")
                DRIFT_DETECTED=true
            fi
        fi
    done <<< "$POLICY_CHECKS"

    # Find checks in GitHub but not in policy
    while IFS= read -r check; do
        [[ -z "$check" ]] && continue
        if ! echo "$POLICY_CHECKS" | grep -Fxq "$check"; then
            # Check if excepted
            if printf '%s\n' "${EXCEPTION_ALLOW_EXTRA[@]}" 2>/dev/null | grep -Fxq "$check"; then
                EXCEPTED_EXTRA+=("$check")
                log "Extra check '$check' is excepted"
            else
                EXTRA_IN_GITHUB+=("$check")
                DRIFT_DETECTED=true
            fi
        fi
    done <<< "$GITHUB_CHECKS"

    log "Missing in GitHub: ${#MISSING_IN_GITHUB[@]} (${#EXCEPTED_MISSING[@]} excepted)"
    log "Extra in GitHub: ${#EXTRA_IN_GITHUB[@]} (${#EXCEPTED_EXTRA[@]} excepted)"
else
    DRIFT_DETECTED=true  # Unknown state is treated as potential drift
fi

# --- Step 5: Generate reports ---
log "Generating drift report..."

# JSON report
MISSING_JSON=$(printf '%s\n' "${MISSING_IN_GITHUB[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
EXTRA_JSON=$(printf '%s\n' "${EXTRA_IN_GITHUB[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
EXCEPTED_MISSING_JSON=$(printf '%s\n' "${EXCEPTED_MISSING[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
EXCEPTED_EXTRA_JSON=$(printf '%s\n' "${EXCEPTED_EXTRA[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
POLICY_JSON_ARRAY=$(echo "$POLICY_CHECKS" | jq -R -s 'split("\n") | map(select(length > 0))')
GITHUB_JSON_ARRAY=$(echo "$GITHUB_CHECKS" | jq -R -s 'split("\n") | map(select(length > 0))')

cat > "$OUT_DIR/branch_protection_drift_report.json" << EOF
{
  "version": "1.1",
  "generated_at": "$TIMESTAMP",
  "repository": "$REPO",
  "branch": "$BRANCH",
  "policy_file": "$POLICY_FILE",
  "policy_version": "$POLICY_VERSION",
  "exceptions_file": "$EXCEPTIONS_FILE",
  "exceptions_loaded": $EXCEPTIONS_LOADED,
  "api_accessible": $API_ACCESSIBLE,
  "api_error": $(jq -n --arg err "$API_ERROR" 'if $err == "" then null else $err end'),
  "drift_detected": $DRIFT_DETECTED,
  "summary": {
    "policy_check_count": $POLICY_COUNT,
    "github_check_count": $GITHUB_COUNT,
    "missing_in_github_count": ${#MISSING_IN_GITHUB[@]},
    "extra_in_github_count": ${#EXTRA_IN_GITHUB[@]},
    "excepted_missing_count": ${#EXCEPTED_MISSING[@]},
    "excepted_extra_count": ${#EXCEPTED_EXTRA[@]},
    "active_exception_count": $EXCEPTION_COUNT
  },
  "policy_checks": $POLICY_JSON_ARRAY,
  "github_checks": $GITHUB_JSON_ARRAY,
  "missing_in_github": $MISSING_JSON,
  "extra_in_github": $EXTRA_JSON,
  "excepted_mismatches": {
    "missing": $EXCEPTED_MISSING_JSON,
    "extra": $EXCEPTED_EXTRA_JSON
  }
}
EOF

# Markdown report
cat > "$OUT_DIR/branch_protection_drift_report.md" << EOF
# Branch Protection Drift Report

**Generated:** $TIMESTAMP
**Repository:** $REPO
**Branch:** $BRANCH
**Policy Version:** $POLICY_VERSION
**Exceptions Loaded:** $EXCEPTIONS_LOADED

---

## Summary

| Metric | Value |
|--------|-------|
| Policy Check Count | $POLICY_COUNT |
| GitHub Check Count | $GITHUB_COUNT |
| Missing in GitHub | ${#MISSING_IN_GITHUB[@]} |
| Extra in GitHub | ${#EXTRA_IN_GITHUB[@]} |
| Excepted (Missing) | ${#EXCEPTED_MISSING[@]} |
| Excepted (Extra) | ${#EXCEPTED_EXTRA[@]} |
| **Drift Detected** | $DRIFT_DETECTED |

---

EOF

if [[ "$API_ACCESSIBLE" == "false" ]]; then
    cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF
## API Access Issue

**Error:** $API_ERROR

Unable to read branch protection settings. This could mean:
- Branch protection is not configured for \`$BRANCH\`
- The GitHub token lacks \`admin:repo\` or \`read:org\` permissions
- The repository does not exist or is not accessible

### Remediation

1. Ensure branch protection is enabled for \`$BRANCH\`
2. Verify the GitHub token has appropriate permissions
3. If using GitHub Actions, ensure the workflow has \`contents: read\` and repository access

---

EOF
fi

if [[ ${#MISSING_IN_GITHUB[@]} -gt 0 ]]; then
    cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF
## Missing in GitHub Branch Protection

These checks are required by policy but NOT enforced in GitHub branch protection:

EOF
    for check in "${MISSING_IN_GITHUB[@]}"; do
        echo "- \`$check\`" >> "$OUT_DIR/branch_protection_drift_report.md"
    done

    cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF

### Remediation

Add these checks to branch protection:

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Edit the rule for \`$BRANCH\`
3. Under "Require status checks to pass before merging":
   - Enable "Require status checks to pass"
   - Search for and add each missing check

Or use the GitHub CLI:
\`\`\`bash
# View current protection
gh api repos/$REPO/branches/$BRANCH/protection/required_status_checks

# Update required checks (requires admin access)
gh api repos/$REPO/branches/$BRANCH/protection/required_status_checks \\
  -X PATCH \\
  -f contexts[]="Check Name 1" \\
  -f contexts[]="Check Name 2"
\`\`\`

---

EOF
fi

if [[ ${#EXTRA_IN_GITHUB[@]} -gt 0 ]]; then
    cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF
## Extra in GitHub Branch Protection

These checks are enforced in GitHub but NOT listed in policy:

EOF
    for check in "${EXTRA_IN_GITHUB[@]}"; do
        echo "- \`$check\`" >> "$OUT_DIR/branch_protection_drift_report.md"
    done

    cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF

### Remediation

Either:

**Option A: Add to policy** (if these checks should be required)
1. Edit \`$POLICY_FILE\`
2. Add entries to \`always_required\` section
3. Create PR for review

**Option B: Remove from GitHub** (if these checks are not needed)
1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Edit the rule for \`$BRANCH\`
3. Remove the extra checks from required status checks

---

EOF
fi

if [[ ${#EXCEPTED_MISSING[@]} -gt 0 || ${#EXCEPTED_EXTRA[@]} -gt 0 ]]; then
    cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF
## Excepted Mismatches (Intentional)

These mismatches are covered by active exceptions in \`REQUIRED_CHECKS_EXCEPTIONS.yml\`:

EOF
    for check in "${EXCEPTED_MISSING[@]}"; do
        echo "- \`$check\` — allowed missing in GitHub" >> "$OUT_DIR/branch_protection_drift_report.md"
    done
    for check in "${EXCEPTED_EXTRA[@]}"; do
        echo "- \`$check\` — allowed extra in GitHub" >> "$OUT_DIR/branch_protection_drift_report.md"
    done

    cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF

> **Note:** Exceptions are temporary and will expire. Review \`$EXCEPTIONS_FILE\` for details.

---

EOF
fi

if [[ "$DRIFT_DETECTED" == "false" && "$API_ACCESSIBLE" == "true" ]]; then
    cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF
## Status: No Drift Detected

Policy and GitHub branch protection are in sync.

All ${POLICY_COUNT} always-required checks from the policy are enforced in GitHub branch protection.

---

EOF
fi

cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF
## Policy Checks (Always Required)

EOF

while IFS= read -r check; do
    [[ -z "$check" ]] && continue
    echo "- \`$check\`" >> "$OUT_DIR/branch_protection_drift_report.md"
done <<< "$POLICY_CHECKS"

cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF

---

## GitHub Branch Protection Checks

EOF

if [[ "$API_ACCESSIBLE" == "true" && -n "$GITHUB_CHECKS" ]]; then
    while IFS= read -r check; do
        [[ -z "$check" ]] && continue
        echo "- \`$check\`" >> "$OUT_DIR/branch_protection_drift_report.md"
    done <<< "$GITHUB_CHECKS"
else
    echo "_Unable to retrieve GitHub checks_" >> "$OUT_DIR/branch_protection_drift_report.md"
fi

cat >> "$OUT_DIR/branch_protection_drift_report.md" << EOF

---

## References

- [REQUIRED_CHECKS_POLICY.yml]($POLICY_FILE)
- [Branch Protection Settings](https://github.com/$REPO/settings/branches)
- [Branch Protection Drift Documentation](docs/ci/BRANCH_PROTECTION_DRIFT.md)

---

*Generated by check_branch_protection_drift.sh*
EOF

# Output summary
log_info "Drift report generated:"
log_info "  JSON: $OUT_DIR/branch_protection_drift_report.json"
log_info "  Markdown: $OUT_DIR/branch_protection_drift_report.md"

if [[ "$DRIFT_DETECTED" == "true" ]]; then
    log_warn "DRIFT DETECTED - Policy and GitHub branch protection are out of sync"
    if [[ ${#MISSING_IN_GITHUB[@]} -gt 0 ]]; then
        log_warn "  Missing in GitHub: ${MISSING_IN_GITHUB[*]}"
    fi
    if [[ ${#EXTRA_IN_GITHUB[@]} -gt 0 ]]; then
        log_warn "  Extra in GitHub: ${EXTRA_IN_GITHUB[*]}"
    fi

    if [[ "$FAIL_ON_DRIFT" == "true" ]]; then
        log_error "Failing due to detected drift (--fail-on-drift active)"
        exit 1
    fi
else
    log_info "No drift detected - Policy and GitHub branch protection are in sync"
fi

# Always exit 0 unless FAIL_ON_DRIFT is true and drift was found
exit 0
