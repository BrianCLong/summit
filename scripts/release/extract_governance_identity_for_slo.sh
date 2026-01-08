#!/usr/bin/env bash
#
# extract_governance_identity_for_slo.sh - Extract governance identity for SLO reports
#
# Extracts governance hash and authenticity status from site artifacts for
# inclusion in monthly SLO issues. Safe for public display (counts-only).
#
# Usage:
#   ./extract_governance_identity_for_slo.sh --site-dir ./site/release-ops
#   ./extract_governance_identity_for_slo.sh --site-dir ./site/release-ops --timeseries ./redaction_metrics_timeseries.json
#
# Options:
#   --site-dir DIR          Site directory containing artifacts (required)
#   --timeseries FILE       Time series file for drift detection (optional)
#   --month YYYY-MM         Month to analyze for drift (default: current month)
#   --json                  Output as JSON instead of markdown
#   --help                  Show this help message
#
# Output Sources:
#   - deployment_marker.json (if present): governance_hash, governance_authenticity
#   - governance_authenticity.json (if present): status, reason
#   - redaction_metrics_timeseries.json: governance hash changes count
#
# Authority: docs/ci/GOVERNANCE_STAMPING.md

set -euo pipefail

SCRIPT_VERSION="1.0.0"

# Configuration
SITE_DIR=""
TIMESERIES_FILE=""
MONTH=""
JSON_OUTPUT=false

show_help() {
    cat << EOF
extract_governance_identity_for_slo.sh v${SCRIPT_VERSION}

Extract governance identity for SLO reports.

Usage:
  $(basename "$0") --site-dir DIR [options]

Options:
  --site-dir DIR          Site directory containing artifacts (required)
  --timeseries FILE       Time series file for drift detection
  --month YYYY-MM         Month to analyze for drift (default: current)
  --json                  Output as JSON instead of markdown
  --help                  Show this help message

Output (Markdown):
  ### Governance Identity
  - **Governance Hash:** \`<hash>\`
  - **Governance Authenticity:** VERIFIED|UNKNOWN|NOT_VERIFIED
  - **Governance Drift:** N changes in period

Output (JSON):
  {"governance_hash": "...", "authenticity": "...", "drift_count": N}

Examples:
  $(basename "$0") --site-dir ./site/release-ops
  $(basename "$0") --site-dir ./site/release-ops --timeseries ./timeseries.json --month 2026-01
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --site-dir)
            SITE_DIR="$2"
            shift 2
            ;;
        --timeseries)
            TIMESERIES_FILE="$2"
            shift 2
            ;;
        --month)
            MONTH="$2"
            shift 2
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "ERROR: Unknown option: $1" >&2
            show_help
            exit 2
            ;;
    esac
done

# Validate required arguments
if [[ -z "$SITE_DIR" ]]; then
    echo "ERROR: Missing required argument: --site-dir" >&2
    exit 2
fi

# Set default month to current
if [[ -z "$MONTH" ]]; then
    MONTH=$(date +%Y-%m)
fi

# Set default timeseries file
if [[ -z "$TIMESERIES_FILE" && -f "${SITE_DIR}/redaction_metrics_timeseries.json" ]]; then
    TIMESERIES_FILE="${SITE_DIR}/redaction_metrics_timeseries.json"
fi

# Initialize values
GOVERNANCE_HASH="UNKNOWN"
GOVERNANCE_HASH_SHORT="UNKNOWN"
AUTHENTICITY_STATUS="UNKNOWN"
AUTHENTICITY_REASON="no_data"
DRIFT_COUNT=0
DRIFT_MESSAGE=""

# Extract from deployment_marker.json
if [[ -f "${SITE_DIR}/deployment_marker.json" ]]; then
    MARKER_HASH=$(jq -r '.governance_hash // empty' "${SITE_DIR}/deployment_marker.json" 2>/dev/null || echo "")
    if [[ -n "$MARKER_HASH" && "$MARKER_HASH" != "null" ]]; then
        GOVERNANCE_HASH="$MARKER_HASH"
        GOVERNANCE_HASH_SHORT="${MARKER_HASH:0:16}..."
    fi

    MARKER_AUTH=$(jq -r '.governance_authenticity // empty' "${SITE_DIR}/deployment_marker.json" 2>/dev/null || echo "")
    if [[ -n "$MARKER_AUTH" && "$MARKER_AUTH" != "null" ]]; then
        AUTHENTICITY_STATUS="$MARKER_AUTH"
        AUTHENTICITY_REASON="from_deployment_marker"
    fi
fi

# Extract from governance_authenticity.json (takes precedence)
if [[ -f "${SITE_DIR}/governance_authenticity.json" ]]; then
    AUTH_STATUS=$(jq -r '.status // empty' "${SITE_DIR}/governance_authenticity.json" 2>/dev/null || echo "")
    if [[ -n "$AUTH_STATUS" && "$AUTH_STATUS" != "null" ]]; then
        AUTHENTICITY_STATUS="$AUTH_STATUS"
    fi

    AUTH_REASON=$(jq -r '.reason // empty' "${SITE_DIR}/governance_authenticity.json" 2>/dev/null || echo "")
    if [[ -n "$AUTH_REASON" && "$AUTH_REASON" != "null" ]]; then
        AUTHENTICITY_REASON="$AUTH_REASON"
    fi
fi

# Check for governance lockfile directly in the site dir (fallback)
if [[ "$GOVERNANCE_HASH" == "UNKNOWN" && -f "${SITE_DIR}/governance/governance_lockfile.json" ]]; then
    GOVERNANCE_HASH=$(sha256sum "${SITE_DIR}/governance/governance_lockfile.json" | cut -d' ' -f1)
    GOVERNANCE_HASH_SHORT="${GOVERNANCE_HASH:0:16}..."
fi

# Detect governance drift from timeseries
if [[ -n "$TIMESERIES_FILE" && -f "$TIMESERIES_FILE" ]]; then
    # Extract unique governance hashes from entries in the specified month
    # Look for governance_hash field in entries with matching date prefix
    MONTH_PREFIX="${MONTH}"

    # Count unique governance hashes in the month
    HASHES_IN_MONTH=$(jq -r --arg prefix "${MONTH_PREFIX}" '
        [.series[]? | select(.date != null and (.date | startswith($prefix))) | .governance_hash // empty] |
        unique | length
    ' "$TIMESERIES_FILE" 2>/dev/null || echo "0")

    if [[ "$HASHES_IN_MONTH" -gt 1 ]]; then
        # More than 1 unique hash means changes occurred
        DRIFT_COUNT=$((HASHES_IN_MONTH - 1))
        DRIFT_MESSAGE="${DRIFT_COUNT} change(s) detected"
    elif [[ "$HASHES_IN_MONTH" -eq 1 ]]; then
        DRIFT_COUNT=0
        DRIFT_MESSAGE="No changes"
    else
        DRIFT_MESSAGE="No data available"
    fi
else
    DRIFT_MESSAGE="Time series not available"
fi

# Output
if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat << EOF
{
  "version": "${SCRIPT_VERSION}",
  "month": "${MONTH}",
  "governance_hash": "${GOVERNANCE_HASH}",
  "governance_hash_short": "${GOVERNANCE_HASH_SHORT}",
  "authenticity_status": "${AUTHENTICITY_STATUS}",
  "authenticity_reason": "${AUTHENTICITY_REASON}",
  "drift_count": ${DRIFT_COUNT},
  "drift_message": "${DRIFT_MESSAGE}"
}
EOF
else
    # Generate markdown block
    cat << EOF

### Governance Identity

| Field | Value |
|-------|-------|
| Governance Hash | \`${GOVERNANCE_HASH_SHORT}\` |
| Governance Authenticity | ${AUTHENTICITY_STATUS} |
| Governance Drift (${MONTH}) | ${DRIFT_MESSAGE} |

EOF

    # Add reason note if not verified
    if [[ "$AUTHENTICITY_STATUS" != "VERIFIED" && "$AUTHENTICITY_REASON" != "no_data" ]]; then
        echo "_Note: Authenticity reason: ${AUTHENTICITY_REASON}_"
        echo ""
    fi
fi
