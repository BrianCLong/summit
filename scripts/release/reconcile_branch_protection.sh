#!/usr/bin/env bash
# reconcile_branch_protection.sh
# Generates reconciliation plan for branch protection vs policy alignment
#
# Plan mode (default): Outputs actionable steps to align GitHub with policy
# Apply mode: Attempts to PATCH branch protection (requires admin access)
#
# Usage:
#   ./scripts/release/reconcile_branch_protection.sh --branch main
#   ./scripts/release/reconcile_branch_protection.sh --mode apply --i-understand-admin-required true
#
# Authority: docs/ci/BRANCH_PROTECTION_RECONCILIATION.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Defaults
REPO=""
BRANCH="main"
POLICY_FILE="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.yml"
EXCEPTIONS_FILE="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml"
OUT_DIR="artifacts/release-train"
MODE="plan"
I_UNDERSTAND=false
VERBOSE=false

usage() {
    cat << 'EOF'
Usage: reconcile_branch_protection.sh [OPTIONS]

Generate reconciliation plan for branch protection alignment with policy.

Options:
  --repo OWNER/REPO               GitHub repository (default: inferred)
  --branch BRANCH                 Branch to reconcile (default: main)
  --policy FILE                   Policy file (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)
  --exceptions FILE               Exceptions file (default: docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml)
  --out-dir DIR                   Output directory (default: artifacts/release-train)
  --mode plan|apply               Mode (default: plan)
  --i-understand-admin-required   Required for apply mode (default: false)
  --verbose                       Enable verbose logging
  --help                          Show this help

Modes:
  plan  - Generate reconciliation plan only (safe, read-only)
  apply - Attempt to PATCH branch protection (requires admin access)

Outputs:
  - branch_protection_reconcile_plan.md
  - branch_protection_reconcile_plan.json
EOF
    exit 0
}

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[reconcile] $*" >&2
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
        --mode)
            MODE="$2"
            shift 2
            ;;
        --i-understand-admin-required)
            I_UNDERSTAND="$2"
            shift 2
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

# Validate mode
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
    log_error "Invalid mode: $MODE (must be plan or apply)"
    exit 1
fi

# Apply mode guard
if [[ "$MODE" == "apply" && "$I_UNDERSTAND" != "true" ]]; then
    log_error "Apply mode requires --i-understand-admin-required true"
    log_error "This flag confirms you have admin access and understand the implications."
    exit 1
fi

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
log "Mode: $MODE"

mkdir -p "$OUT_DIR"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# --- Step 1: Extract policy requirements ---
log "Extracting policy requirements..."

if [[ ! -f "$POLICY_FILE" ]]; then
    log_error "Policy file not found: $POLICY_FILE"
    exit 1
fi

POLICY_JSON=$("${SCRIPT_DIR}/extract_required_checks_from_policy.sh" \
    --policy "$POLICY_FILE" \
    ${VERBOSE:+--verbose})

POLICY_CHECKS=$(echo "$POLICY_JSON" | jq -r '.always_required[]' | sort)
POLICY_VERSION=$(echo "$POLICY_JSON" | jq -r '.policy_version')

log "Policy version: $POLICY_VERSION"

# --- Step 2: Load exceptions ---
EXCEPTIONS_LOADED=false
EXCEPTION_ALLOW_MISSING=()
EXCEPTION_ALLOW_EXTRA=()

if [[ -f "$EXCEPTIONS_FILE" ]]; then
    log "Loading exceptions from: $EXCEPTIONS_FILE"

    if command -v yq &> /dev/null; then
        # Parse exceptions with yq
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
                continue
            fi

            # Check if expired
            if [[ "$EXPIRES" < "$NOW_DATE" ]]; then
                log_warn "Exception $ID expired on $EXPIRES - not applying"
                continue
            fi

            if [[ "$DIRECTION" == "allow_missing_in_github" ]]; then
                EXCEPTION_ALLOW_MISSING+=("$CHECK")
                log "Exception $ID: Allow '$CHECK' missing in GitHub (expires: $EXPIRES)"
            elif [[ "$DIRECTION" == "allow_extra_in_github" ]]; then
                EXCEPTION_ALLOW_EXTRA+=("$CHECK")
                log "Exception $ID: Allow '$CHECK' extra in GitHub (expires: $EXPIRES)"
            fi
        done < <(yq -r '.exceptions[]? | "\(.id)|\(.check_name)|\(.direction)|\(.expires_at)|\(.branch)"' "$EXCEPTIONS_FILE" 2>/dev/null || echo "")

        EXCEPTIONS_LOADED=true
    else
        log_warn "yq not available - exceptions not loaded"
    fi
fi

# --- Step 3: Query GitHub branch protection ---
log "Querying GitHub branch protection..."

API_ENDPOINT="repos/${REPO}/branches/${BRANCH}/protection/required_status_checks"
API_ERROR=""
GITHUB_CHECKS=""
API_ACCESSIBLE=true

set +e
API_RESPONSE=$(gh api "$API_ENDPOINT" 2>&1)
API_EXIT_CODE=$?
set -e

if [[ $API_EXIT_CODE -ne 0 ]]; then
    API_ACCESSIBLE=false
    if echo "$API_RESPONSE" | grep -q "404"; then
        API_ERROR="Branch protection not configured for $BRANCH"
    elif echo "$API_RESPONSE" | grep -q "403"; then
        API_ERROR="Insufficient permissions to read branch protection"
    else
        API_ERROR="API error: $API_RESPONSE"
    fi
    log_warn "$API_ERROR"
else
    GITHUB_CHECKS=$(echo "$API_RESPONSE" | jq -r '.contexts[]? // empty' 2>/dev/null | sort || echo "")
    if [[ -z "$GITHUB_CHECKS" ]]; then
        GITHUB_CHECKS=$(echo "$API_RESPONSE" | jq -r '.checks[]?.context // empty' 2>/dev/null | sort || echo "")
    fi
fi

# --- Step 4: Compute diffs ---
ADD_CHECKS=()
REMOVE_CHECKS=()
SKIPPED_ADD=()
SKIPPED_REMOVE=()

if [[ "$API_ACCESSIBLE" == "true" ]]; then
    # Find checks to add (in policy, not in GitHub)
    while IFS= read -r check; do
        [[ -z "$check" ]] && continue
        if ! echo "$GITHUB_CHECKS" | grep -Fxq "$check"; then
            # Check if excepted
            if printf '%s\n' "${EXCEPTION_ALLOW_MISSING[@]}" | grep -Fxq "$check" 2>/dev/null; then
                SKIPPED_ADD+=("$check")
            else
                ADD_CHECKS+=("$check")
            fi
        fi
    done <<< "$POLICY_CHECKS"

    # Find checks to remove (in GitHub, not in policy)
    while IFS= read -r check; do
        [[ -z "$check" ]] && continue
        if ! echo "$POLICY_CHECKS" | grep -Fxq "$check"; then
            # Check if excepted
            if printf '%s\n' "${EXCEPTION_ALLOW_EXTRA[@]}" | grep -Fxq "$check" 2>/dev/null; then
                SKIPPED_REMOVE+=("$check")
            else
                REMOVE_CHECKS+=("$check")
            fi
        fi
    done <<< "$GITHUB_CHECKS"
fi

log "Checks to add: ${#ADD_CHECKS[@]}"
log "Checks to remove: ${#REMOVE_CHECKS[@]}"
log "Skipped (excepted): ${#SKIPPED_ADD[@]} add, ${#SKIPPED_REMOVE[@]} remove"

# --- Step 5: Build target state ---
TARGET_CHECKS=()
while IFS= read -r check; do
    [[ -z "$check" ]] && continue
    TARGET_CHECKS+=("$check")
done <<< "$POLICY_CHECKS"

# Remove excepted checks from target
for exc in "${EXCEPTION_ALLOW_MISSING[@]}"; do
    TARGET_CHECKS=("${TARGET_CHECKS[@]/$exc}")
done

# Add excepted extra checks to target
for exc in "${EXCEPTION_ALLOW_EXTRA[@]}"; do
    TARGET_CHECKS+=("$exc")
done

# Clean up empty entries and sort (preserve spaces in check names)
mapfile -t TARGET_CHECKS < <(printf '%s\n' "${TARGET_CHECKS[@]}" | grep -v '^$' | sort -u)

# --- Step 6: Generate outputs ---
log "Generating reconciliation plan..."

# Build JSON arrays
ADD_JSON=$(printf '%s\n' "${ADD_CHECKS[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
REMOVE_JSON=$(printf '%s\n' "${REMOVE_CHECKS[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
SKIPPED_ADD_JSON=$(printf '%s\n' "${SKIPPED_ADD[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
SKIPPED_REMOVE_JSON=$(printf '%s\n' "${SKIPPED_REMOVE[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
TARGET_JSON=$(printf '%s\n' "${TARGET_CHECKS[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
POLICY_JSON_ARRAY=$(echo "$POLICY_CHECKS" | jq -R -s 'split("\n") | map(select(length > 0))')
GITHUB_JSON_ARRAY=$(echo "$GITHUB_CHECKS" | jq -R -s 'split("\n") | map(select(length > 0))')

# Determine reconciliation status
# "unknown" when API is inaccessible, true/false when we can compute diff
if [[ "$API_ACCESSIBLE" == "false" ]]; then
    NEEDS_RECONCILIATION="unknown"
elif [[ ${#ADD_CHECKS[@]} -gt 0 || ${#REMOVE_CHECKS[@]} -gt 0 ]]; then
    NEEDS_RECONCILIATION=true
else
    NEEDS_RECONCILIATION=false
fi

# Format needs_reconciliation for JSON (string "unknown" or boolean)
if [[ "$NEEDS_RECONCILIATION" == "unknown" ]]; then
    NEEDS_RECONCILIATION_JSON='"unknown"'
else
    NEEDS_RECONCILIATION_JSON="$NEEDS_RECONCILIATION"
fi

# JSON output
cat > "$OUT_DIR/branch_protection_reconcile_plan.json" << EOF
{
  "version": "1.0",
  "generated_at": "$TIMESTAMP",
  "repository": "$REPO",
  "branch": "$BRANCH",
  "policy_version": "$POLICY_VERSION",
  "mode": "$MODE",
  "api_accessible": $API_ACCESSIBLE,
  "api_error": $(jq -n --arg err "$API_ERROR" 'if $err == "" then null else $err end'),
  "needs_reconciliation": $NEEDS_RECONCILIATION_JSON,
  "summary": {
    "add_count": ${#ADD_CHECKS[@]},
    "remove_count": ${#REMOVE_CHECKS[@]},
    "skipped_add_count": ${#SKIPPED_ADD[@]},
    "skipped_remove_count": ${#SKIPPED_REMOVE[@]}
  },
  "actions": {
    "add_required_checks": $ADD_JSON,
    "remove_required_checks": $REMOVE_JSON
  },
  "skipped_due_to_exceptions": {
    "add": $SKIPPED_ADD_JSON,
    "remove": $SKIPPED_REMOVE_JSON
  },
  "current_state": {
    "policy_checks": $POLICY_JSON_ARRAY,
    "github_checks": $GITHUB_JSON_ARRAY
  },
  "target_state": $TARGET_JSON
}
EOF

# Markdown output
cat > "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
# Branch Protection Reconciliation Plan

**Generated:** $TIMESTAMP
**Repository:** $REPO
**Branch:** $BRANCH
**Policy Version:** $POLICY_VERSION
**Mode:** $MODE

---

## Summary

| Action | Count |
|--------|-------|
| Checks to Add | ${#ADD_CHECKS[@]} |
| Checks to Remove | ${#REMOVE_CHECKS[@]} |
| Skipped (Excepted) | $((${#SKIPPED_ADD[@]} + ${#SKIPPED_REMOVE[@]})) |
| **Needs Reconciliation** | $NEEDS_RECONCILIATION |

---

EOF

if [[ "$API_ACCESSIBLE" == "false" ]]; then
    cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
## API Access Issue

**Error:** $API_ERROR

Cannot read branch protection settings. Plan is based on policy only.

---

EOF
fi

if [[ ${#ADD_CHECKS[@]} -gt 0 ]]; then
    cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
## Checks to ADD to Branch Protection

These checks are required by policy but not enforced in GitHub:

EOF
    for check in "${ADD_CHECKS[@]}"; do
        echo "- [ ] \`$check\`" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
    done
    echo "" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
fi

if [[ ${#REMOVE_CHECKS[@]} -gt 0 ]]; then
    cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
## Checks to REMOVE from Branch Protection

These checks are enforced in GitHub but not required by policy:

EOF
    for check in "${REMOVE_CHECKS[@]}"; do
        echo "- [ ] \`$check\`" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
    done
    echo "" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
fi

if [[ ${#SKIPPED_ADD[@]} -gt 0 || ${#SKIPPED_REMOVE[@]} -gt 0 ]]; then
    cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
## Skipped Due to Exceptions

These mismatches are intentional and covered by active exceptions:

EOF
    for check in "${SKIPPED_ADD[@]}"; do
        echo "- \`$check\` (allow missing in GitHub)" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
    done
    for check in "${SKIPPED_REMOVE[@]}"; do
        echo "- \`$check\` (allow extra in GitHub)" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
    done
    echo "" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
fi

if [[ "$NEEDS_RECONCILIATION" == "true" ]]; then
    cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
---

## Remediation Options

### Option A: Manual UI Steps

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Click **Edit** on the rule for \`$BRANCH\`
3. Under "Require status checks to pass before merging":
EOF

    if [[ ${#ADD_CHECKS[@]} -gt 0 ]]; then
        echo "   - **Add** the following checks:" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
        for check in "${ADD_CHECKS[@]}"; do
            echo "     - \`$check\`" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
        done
    fi

    if [[ ${#REMOVE_CHECKS[@]} -gt 0 ]]; then
        echo "   - **Remove** the following checks:" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
        for check in "${REMOVE_CHECKS[@]}"; do
            echo "     - \`$check\`" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
        done
    fi

    cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
4. Click **Save changes**

### Option B: GitHub CLI (Requires Admin Access)

\`\`\`bash
# View current branch protection
gh api repos/$REPO/branches/$BRANCH/protection/required_status_checks

# Set required status checks to match policy
# This REPLACES all existing contexts
gh api repos/$REPO/branches/$BRANCH/protection/required_status_checks \\
  -X PATCH \\
  -H "Accept: application/vnd.github+json" \\
  -f strict=true \\
EOF

    # Add contexts to the command
    for check in "${TARGET_CHECKS[@]}"; do
        echo "  -f contexts[]=\"$check\" \\" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
    done

    # Remove trailing backslash from last line
    sed -i.bak '$ s/ \\$//' "$OUT_DIR/branch_protection_reconcile_plan.md"
    rm -f "$OUT_DIR/branch_protection_reconcile_plan.md.bak"

    cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF

\`\`\`

### Option C: Run Reconciler in Apply Mode

\`\`\`bash
./scripts/release/reconcile_branch_protection.sh \\
  --branch $BRANCH \\
  --mode apply \\
  --i-understand-admin-required true
\`\`\`

**Warning:** Apply mode requires admin access and will modify branch protection settings.

EOF
elif [[ "$NEEDS_RECONCILIATION" == "unknown" ]]; then
    cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
---

## Status: Unable to Determine

Cannot determine reconciliation status because branch protection settings
could not be read from GitHub API.

**Recommended Actions:**
1. Verify branch protection is enabled for \`$BRANCH\`
2. Check that you have read access to branch protection settings
3. If branch protection should be enabled, create it via GitHub UI or API first

**Policy requires these checks:**
EOF
    for check in "${TARGET_CHECKS[@]}"; do
        echo "- \`$check\`" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
    done
    echo "" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
else
    cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
---

## Status: Already Aligned

Branch protection settings match policy (accounting for exceptions).
No reconciliation needed.

EOF
fi

cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF
---

## Target State

After reconciliation, required status checks should be:

EOF

for check in "${TARGET_CHECKS[@]}"; do
    echo "- \`$check\`" >> "$OUT_DIR/branch_protection_reconcile_plan.md"
done

cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF

---

## References

- [REQUIRED_CHECKS_POLICY.yml]($POLICY_FILE)
- [REQUIRED_CHECKS_EXCEPTIONS.yml]($EXCEPTIONS_FILE)
- [Branch Protection Settings](https://github.com/$REPO/settings/branches)

---

*Generated by reconcile_branch_protection.sh*
EOF

# --- Step 7: Apply mode ---
APPLY_SUCCESS=false
APPLY_ERROR=""

if [[ "$MODE" == "apply" && "$NEEDS_RECONCILIATION" == "true" && "$API_ACCESSIBLE" == "true" ]]; then
    log_info "Attempting to apply reconciliation..."

    # Build the PATCH payload
    CONTEXTS_ARRAY=$(printf '%s\n' "${TARGET_CHECKS[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')

    PATCH_PAYLOAD=$(jq -n \
        --argjson contexts "$CONTEXTS_ARRAY" \
        '{
            strict: true,
            contexts: $contexts
        }')

    log "PATCH payload: $PATCH_PAYLOAD"

    set +e
    PATCH_RESPONSE=$(echo "$PATCH_PAYLOAD" | gh api "$API_ENDPOINT" \
        -X PATCH \
        -H "Accept: application/vnd.github+json" \
        --input - 2>&1)
    PATCH_EXIT_CODE=$?
    set -e

    if [[ $PATCH_EXIT_CODE -eq 0 ]]; then
        APPLY_SUCCESS=true
        log_info "Successfully applied reconciliation!"

        # Update JSON with apply result
        jq --arg success "true" '.apply_result = {success: true, message: "Branch protection updated"}' \
            "$OUT_DIR/branch_protection_reconcile_plan.json" > "$OUT_DIR/branch_protection_reconcile_plan.json.tmp"
        mv "$OUT_DIR/branch_protection_reconcile_plan.json.tmp" "$OUT_DIR/branch_protection_reconcile_plan.json"

        cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF

---

## Apply Result

**Status:** SUCCESS

Branch protection has been updated to match policy.
EOF
    else
        APPLY_ERROR="$PATCH_RESPONSE"
        log_error "Failed to apply: $APPLY_ERROR"

        jq --arg error "$APPLY_ERROR" '.apply_result = {success: false, error: $error}' \
            "$OUT_DIR/branch_protection_reconcile_plan.json" > "$OUT_DIR/branch_protection_reconcile_plan.json.tmp"
        mv "$OUT_DIR/branch_protection_reconcile_plan.json.tmp" "$OUT_DIR/branch_protection_reconcile_plan.json"

        cat >> "$OUT_DIR/branch_protection_reconcile_plan.md" << EOF

---

## Apply Result

**Status:** FAILED

\`\`\`
$APPLY_ERROR
\`\`\`

Please use the manual UI steps or ensure you have admin access.
EOF
    fi
fi

# Output summary
log_info "Reconciliation plan generated:"
log_info "  JSON: $OUT_DIR/branch_protection_reconcile_plan.json"
log_info "  Markdown: $OUT_DIR/branch_protection_reconcile_plan.md"

if [[ "$NEEDS_RECONCILIATION" == "true" ]]; then
    log_warn "Reconciliation needed: ${#ADD_CHECKS[@]} to add, ${#REMOVE_CHECKS[@]} to remove"
elif [[ "$NEEDS_RECONCILIATION" == "unknown" ]]; then
    log_warn "Unable to determine reconciliation status - branch protection API not accessible"
else
    log_info "No reconciliation needed - branch protection matches policy"
fi

if [[ "$MODE" == "apply" ]]; then
    if [[ "$APPLY_SUCCESS" == "true" ]]; then
        log_info "Apply succeeded"
    else
        log_error "Apply failed: $APPLY_ERROR"
        exit 1
    fi
fi

exit 0
