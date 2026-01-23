#!/usr/bin/env bash
# redact_release_ops_content.sh v1.0.0
# Deterministic redaction layer for Release Ops content
#
# Applies policy-driven redaction to produce sanitized or full outputs.
# Used by build_release_ops_site.sh to ensure Pages-safe content.
#
# Authority: docs/ci/RELEASE_OPS_REDACTION.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
DEFAULT_POLICY="${REPO_ROOT}/docs/ci/REDACTION_POLICY.yml"

# --- Logging ---
log_info() {
    echo "[INFO] $*" >&2
}

log_warn() {
    echo "[WARN] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# --- Usage ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Applies deterministic redaction to Release Ops content.

OPTIONS:
    --in FILE         Input file to redact
    --out FILE        Output file (default: stdout)
    --mode MODE       Render mode: sanitized|full (default: sanitized)
    --policy FILE     Policy file (default: docs/ci/REDACTION_POLICY.yml)
    --type TYPE       Content type: markdown|json (auto-detected if not set)
    --verify-only     Only verify no forbidden patterns, don't redact
    --dry-run         Show what would be redacted without writing
    --verbose         Enable verbose logging
    --help            Show this help message

MODES:
    sanitized   Apply full redaction for public Pages (default)
    full        Pass through with minimal normalization (internal use)

EXAMPLES:
    # Redact markdown for public Pages
    $0 --in single_page.md --out single_page_sanitized.md --mode sanitized

    # Verify no forbidden patterns in a file
    $0 --in output.md --verify-only

    # Redact JSON dashboard
    $0 --in dashboard.json --out dashboard_summary.json --mode sanitized --type json

    # Dry run to see what would be redacted
    $0 --in single_page.md --mode sanitized --dry-run
EOF
}

# --- Pattern Extraction from Policy ---
# Extracts forbidden patterns from REDACTION_POLICY.yml
extract_forbidden_patterns() {
    local policy_file="$1"

    if [[ ! -f "${policy_file}" ]]; then
        log_error "Policy file not found: ${policy_file}"
        return 1
    fi

    # Extract patterns from forbidden_patterns section
    # Format: - pattern: "regex"
    grep -A1 '^\s*- pattern:' "${policy_file}" 2>/dev/null | \
        grep 'pattern:' | \
        sed -E 's/.*pattern:\s*"([^"]+)".*/\1/' | \
        sed -E "s/.*pattern:\s*'([^']+)'.*/\1/"
}

# Extract replacement for a pattern
extract_replacement() {
    local policy_file="$1"
    local pattern="$2"

    # Find the replacement for this pattern (simplified extraction)
    local in_block=false
    local found_pattern=false

    while IFS= read -r line; do
        if [[ "${line}" =~ "pattern:" ]] && [[ "${line}" =~ "${pattern:0:20}" ]]; then
            found_pattern=true
        elif [[ "${found_pattern}" == "true" ]] && [[ "${line}" =~ "replacement:" ]]; then
            echo "${line}" | sed -E 's/.*replacement:\s*"([^"]+)".*/\1/' | sed -E "s/.*replacement:\s*'([^']+)'.*/\1/"
            return 0
        elif [[ "${found_pattern}" == "true" ]] && [[ "${line}" =~ "- pattern:" ]]; then
            break
        fi
    done < "${policy_file}"

    echo "[REDACTED]"
}

# Extract sections to collapse
extract_collapse_sections() {
    local policy_file="$1"

    grep -A2 'heading:' "${policy_file}" 2>/dev/null | \
        grep 'heading:' | \
        sed -E 's/.*heading:\s*"([^"]+)".*/\1/' | \
        sed -E "s/.*heading:\s*'([^']+)'.*/\1/"
}

# Extract sections to remove
extract_remove_sections() {
    local policy_file="$1"

    # Get items under remove_in_sanitized
    awk '/remove_in_sanitized:/,/^[a-z]/' "${policy_file}" 2>/dev/null | \
        grep '^\s*-\s*"' | \
        sed -E 's/.*-\s*"([^"]+)".*/\1/'
}

# --- Redaction Functions ---

# Redact forbidden patterns from content
redact_forbidden_patterns() {
    local content="$1"
    local policy_file="$2"
    local verbose="$3"

    local result="${content}"
    local pattern_count=0

    while IFS= read -r pattern; do
        [[ -z "${pattern}" ]] && continue

        local replacement
        replacement=$(extract_replacement "${policy_file}" "${pattern}")

        # Count matches before redaction
        local matches
        matches=$(echo "${result}" | grep -cE "${pattern}" 2>/dev/null || echo "0")
        matches=$(echo "${matches}" | tr -d '[:space:]')

        if [[ "${matches}" -gt 0 ]]; then
            [[ "${verbose}" == "true" ]] && log_info "Redacting pattern '${pattern}': ${matches} match(es)"
            result=$(echo "${result}" | sed -E "s/${pattern}/${replacement}/g")
            pattern_count=$((pattern_count + matches))
        fi
    done < <(extract_forbidden_patterns "${policy_file}")

    [[ "${verbose}" == "true" ]] && log_info "Total patterns redacted: ${pattern_count}"
    echo "${result}"
}

# Collapse a section to summary only
collapse_section() {
    local content="$1"
    local heading="$2"
    local replacement="$3"

    # Find the section and count items (lines starting with - or *)
    local in_section=false
    local item_count=0
    local result=""
    local section_content=""
    local heading_level=""

    while IFS= read -r line; do
        # Check if this is our target heading
        if [[ "${line}" =~ ^(#{1,6})\s*${heading} ]]; then
            in_section=true
            heading_level="${BASH_REMATCH[1]}"
            result+="${line}"$'\n'
            continue
        fi

        # Check if we've hit the next section of same or higher level
        if [[ "${in_section}" == "true" ]] && [[ "${line}" =~ ^#{1,${#heading_level}}\s ]]; then
            # End of our section - add replacement with count
            local final_replacement="${replacement/\{count\}/${item_count}}"
            result+="${final_replacement}"$'\n'$'\n'
            in_section=false
            result+="${line}"$'\n'
            continue
        fi

        if [[ "${in_section}" == "true" ]]; then
            # Count list items
            if [[ "${line}" =~ ^[[:space:]]*[-*] ]]; then
                item_count=$((item_count + 1))
            fi
            section_content+="${line}"$'\n'
        else
            result+="${line}"$'\n'
        fi
    done <<< "${content}"

    # Handle section at end of file
    if [[ "${in_section}" == "true" ]]; then
        local final_replacement="${replacement/\{count\}/${item_count}}"
        result+="${final_replacement}"$'\n'
    fi

    echo "${result}"
}

# Remove a section entirely
remove_section() {
    local content="$1"
    local heading="$2"
    local show_placeholder="$3"

    local in_section=false
    local result=""
    local heading_level=""

    while IFS= read -r line; do
        # Check if this is our target heading
        if [[ "${line}" =~ ^(#{1,6})[[:space:]]*${heading} ]]; then
            in_section=true
            heading_level="${BASH_REMATCH[1]}"
            if [[ "${show_placeholder}" == "true" ]]; then
                result+="${line}"$'\n'
                result+="_This section is available in the internal report._"$'\n'$'\n'
            fi
            continue
        fi

        # Check if we've hit the next section of same or higher level
        if [[ "${in_section}" == "true" ]] && [[ "${line}" =~ ^#{1,${#heading_level}}[[:space:]] ]]; then
            in_section=false
            result+="${line}"$'\n'
            continue
        fi

        if [[ "${in_section}" != "true" ]]; then
            result+="${line}"$'\n'
        fi
    done <<< "${content}"

    echo "${result}"
}

# Sanitize links - keep only allowed patterns
sanitize_links() {
    local content="$1"
    local policy_file="$2"
    local verbose="$3"

    # For now, apply basic link sanitization
    # Convert internal/comment links to plain text
    local result="${content}"

    # Remove issue comment links (keep just issue reference)
    result=$(echo "${result}" | sed -E 's|\[([^\]]+)\]\(https://github\.com/[^/]+/[^/]+/issues/[0-9]+#issuecomment-[0-9]+\)|[\1]|g')

    # Remove PR discussion links
    result=$(echo "${result}" | sed -E 's|\[([^\]]+)\]\(https://github\.com/[^/]+/[^/]+/pull/[0-9]+#discussion[^\)]*\)|[\1]|g')

    # Remove workflow run links (internal operational detail)
    result=$(echo "${result}" | sed -E 's|\[([^\]]+)\]\(https://github\.com/[^/]+/[^/]+/actions/runs/[0-9]+[^\)]*\)|[\1]|g')

    echo "${result}"
}

# --- JSON Redaction ---

# Sanitize JSON dashboard to summary only
sanitize_json_dashboard() {
    local input_file="$1"
    local output_file="$2"
    local verbose="$3"

    if [[ ! -f "${input_file}" ]]; then
        log_warn "Input JSON not found: ${input_file}"
        # Create minimal placeholder
        cat > "${output_file}" <<EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "mode": "sanitized",
  "summary": {
    "total_candidates": 0,
    "promotable": 0,
    "blocked": 0,
    "pending": 0
  },
  "note": "Source data not available"
}
EOF
        return
    fi

    # Use jq to extract only allowed fields
    if command -v jq &>/dev/null; then
        jq '{
          generated_at: .generated_at,
          mode: "sanitized",
          summary: {
            total_candidates: (.summary.total_candidates // 0),
            promotable: (.summary.promotable // 0),
            blocked: (.summary.blocked // 0),
            pending: (.summary.pending // 0)
          },
          candidates: [(.candidates // [])[] | {
            tag: .tag,
            promotable_state: .promotable_state
          }]
        }' "${input_file}" > "${output_file}" 2>/dev/null || {
            log_warn "Failed to parse JSON, creating minimal summary"
            cat > "${output_file}" <<EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "mode": "sanitized",
  "summary": {
    "total_candidates": 0,
    "promotable": 0,
    "blocked": 0,
    "pending": 0
  },
  "note": "JSON parsing failed"
}
EOF
        }
    else
        log_warn "jq not available, creating minimal summary"
        cat > "${output_file}" <<EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "mode": "sanitized",
  "summary": {
    "total_candidates": 0,
    "promotable": 0,
    "blocked": 0,
    "pending": 0
  },
  "note": "jq not available for full parsing"
}
EOF
    fi

    [[ "${verbose}" == "true" ]] && log_info "Created sanitized JSON summary"
}

# --- Verification ---

# Verify no forbidden patterns remain
verify_no_forbidden_patterns() {
    local content="$1"
    local policy_file="$2"
    local verbose="$3"

    local found_patterns=()
    local exit_code=0

    while IFS= read -r pattern; do
        [[ -z "${pattern}" ]] && continue

        if echo "${content}" | grep -qE "${pattern}" 2>/dev/null; then
            found_patterns+=("${pattern}")
            exit_code=1
        fi
    done < <(extract_forbidden_patterns "${policy_file}")

    if [[ ${#found_patterns[@]} -gt 0 ]]; then
        log_error "Forbidden patterns detected after redaction:"
        for p in "${found_patterns[@]}"; do
            log_error "  - ${p}"
        done
        return 1
    fi

    [[ "${verbose}" == "true" ]] && log_info "Verification passed: no forbidden patterns found"
    return 0
}

# --- Main Redaction Logic ---

redact_markdown() {
    local input_file="$1"
    local output_file="$2"
    local mode="$3"
    local policy_file="$4"
    local dry_run="$5"
    local verbose="$6"

    local content
    content=$(cat "${input_file}")

    if [[ "${mode}" == "full" ]]; then
        # Full mode: pass through with minimal normalization
        [[ "${verbose}" == "true" ]] && log_info "Full mode: passing through unchanged"
        if [[ "${dry_run}" == "true" ]]; then
            log_info "Would write: ${output_file} (unchanged)"
        elif [[ -n "${output_file}" ]]; then
            echo "${content}" > "${output_file}"
        else
            echo "${content}"
        fi
        return 0
    fi

    # Sanitized mode: apply all redactions
    [[ "${verbose}" == "true" ]] && log_info "Sanitized mode: applying redactions"

    # Step 1: Redact forbidden patterns
    content=$(redact_forbidden_patterns "${content}" "${policy_file}" "${verbose}")

    # Step 2: Collapse sensitive sections
    local collapse_sections
    collapse_sections=$(extract_collapse_sections "${policy_file}")

    # Collapse Top Blockers
    if echo "${collapse_sections}" | grep -q "Top Blockers"; then
        [[ "${verbose}" == "true" ]] && log_info "Collapsing section: Top Blockers"
        content=$(collapse_section "${content}" "Top Blockers" "_{count} blocker(s) - see internal report for details_")
    fi

    # Collapse Escalation Status
    if echo "${collapse_sections}" | grep -q "Escalation Status"; then
        [[ "${verbose}" == "true" ]] && log_info "Collapsing section: Escalation Status"
        content=$(collapse_section "${content}" "Escalation Status" "_{count} escalation(s) in progress_")
    fi

    # Collapse Recent Digest
    if echo "${collapse_sections}" | grep -q "Recent Digest"; then
        [[ "${verbose}" == "true" ]] && log_info "Collapsing section: Recent Digest"
        content=$(collapse_section "${content}" "Recent Digest" "_Daily digest available in internal report_")
    fi

    # Collapse Shift Handoff
    if echo "${collapse_sections}" | grep -q "Shift Handoff"; then
        [[ "${verbose}" == "true" ]] && log_info "Collapsing section: Shift Handoff"
        content=$(collapse_section "${content}" "Shift Handoff" "_Handoff notes available in internal report_")
    fi

    # Step 3: Remove fully excluded sections
    local remove_sections
    remove_sections=$(extract_remove_sections "${policy_file}")

    while IFS= read -r section; do
        [[ -z "${section}" ]] && continue
        [[ "${verbose}" == "true" ]] && log_info "Removing section: ${section}"
        content=$(remove_section "${content}" "${section}" "false")
    done <<< "${remove_sections}"

    # Step 4: Sanitize links
    content=$(sanitize_links "${content}" "${policy_file}" "${verbose}")

    # Step 5: Add sanitization notice
    local notice="<!-- Sanitized for public viewing. Internal report available in workflow artifacts. -->"
    content="${notice}"$'\n'"${content}"

    # Step 6: Verify no forbidden patterns remain
    if ! verify_no_forbidden_patterns "${content}" "${policy_file}" "${verbose}"; then
        log_error "FATAL: Forbidden patterns remain after redaction!"
        log_error "This is a bug in the redaction logic. Do not publish."
        return 1
    fi

    # Output
    if [[ "${dry_run}" == "true" ]]; then
        log_info "Would write sanitized content to: ${output_file:-stdout}"
        log_info "Content preview (first 500 chars):"
        echo "${content}" | head -c 500
        echo "..."
    elif [[ -n "${output_file}" ]]; then
        echo "${content}" > "${output_file}"
        [[ "${verbose}" == "true" ]] && log_info "Wrote sanitized content to: ${output_file}"
    else
        echo "${content}"
    fi
}

# --- Main ---
main() {
    local input_file=""
    local output_file=""
    local mode="sanitized"
    local policy_file="${DEFAULT_POLICY}"
    local content_type=""
    local verify_only=false
    local dry_run=false
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --in)
                input_file="$2"
                shift 2
                ;;
            --out)
                output_file="$2"
                shift 2
                ;;
            --mode)
                mode="$2"
                shift 2
                ;;
            --policy)
                policy_file="$2"
                shift 2
                ;;
            --type)
                content_type="$2"
                shift 2
                ;;
            --verify-only)
                verify_only=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Validate inputs
    if [[ -z "${input_file}" ]]; then
        log_error "Input file required (--in)"
        print_usage
        exit 1
    fi

    if [[ ! -f "${input_file}" ]]; then
        log_error "Input file not found: ${input_file}"
        exit 1
    fi

    if [[ ! -f "${policy_file}" ]]; then
        log_error "Policy file not found: ${policy_file}"
        exit 1
    fi

    if [[ "${mode}" != "sanitized" ]] && [[ "${mode}" != "full" ]]; then
        log_error "Invalid mode: ${mode} (must be 'sanitized' or 'full')"
        exit 1
    fi

    # Auto-detect content type if not specified
    if [[ -z "${content_type}" ]]; then
        case "${input_file}" in
            *.json) content_type="json" ;;
            *.md)   content_type="markdown" ;;
            *.html) content_type="markdown" ;;  # Treat HTML as markdown for pattern scanning
            *)      content_type="markdown" ;;
        esac
    fi

    [[ "${verbose}" == "true" ]] && log_info "Redaction script v${SCRIPT_VERSION}"
    [[ "${verbose}" == "true" ]] && log_info "Input: ${input_file}"
    [[ "${verbose}" == "true" ]] && log_info "Output: ${output_file:-stdout}"
    [[ "${verbose}" == "true" ]] && log_info "Mode: ${mode}"
    [[ "${verbose}" == "true" ]] && log_info "Type: ${content_type}"
    [[ "${verbose}" == "true" ]] && log_info "Policy: ${policy_file}"

    # Verify-only mode
    if [[ "${verify_only}" == "true" ]]; then
        local content
        content=$(cat "${input_file}")

        if verify_no_forbidden_patterns "${content}" "${policy_file}" "${verbose}"; then
            log_info "Verification passed: no forbidden patterns found"
            exit 0
        else
            exit 1
        fi
    fi

    # Apply redaction based on content type
    case "${content_type}" in
        json)
            if [[ "${mode}" == "sanitized" ]]; then
                sanitize_json_dashboard "${input_file}" "${output_file}" "${verbose}"
            else
                # Full mode: just copy
                if [[ -n "${output_file}" ]]; then
                    cp "${input_file}" "${output_file}"
                else
                    cat "${input_file}"
                fi
            fi
            ;;
        markdown)
            redact_markdown "${input_file}" "${output_file}" "${mode}" "${policy_file}" "${dry_run}" "${verbose}"
            ;;
        *)
            log_error "Unknown content type: ${content_type}"
            exit 1
            ;;
    esac
}

main "$@"
