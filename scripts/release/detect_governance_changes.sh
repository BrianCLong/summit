#!/usr/bin/env bash
#
# detect_governance_changes.sh - Detect governance hash changes in time series
#
# Analyzes the redaction metrics time series to identify when governance
# configuration changed. Outputs counts-only data safe for publication.
#
# Usage:
#   ./detect_governance_changes.sh --timeseries ./redaction_metrics_timeseries.json
#
# Options:
#   --timeseries FILE   Time series JSON file (required)
#   --out FILE          Output file (default: governance_changes.json in same dir)
#   --verbose           Enable verbose logging
#   --help              Show this help message
#
# Output:
#   governance_changes.json with change events and counts by window.
#
# Authority: docs/ci/GOVERNANCE_STAMPING.md

set -euo pipefail

SCRIPT_VERSION="1.0.0"

# Configuration
TIMESERIES_FILE=""
OUTPUT_FILE=""
VERBOSE=false

log_info() {
    echo "[INFO] $*" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[VERBOSE] $*" >&2
    fi
}

log_error() {
    echo "[ERROR] $*" >&2
}

show_help() {
    cat << EOF
detect_governance_changes.sh v${SCRIPT_VERSION}

Detect governance hash changes in time series data.

Usage:
  $(basename "$0") --timeseries FILE [options]

Options:
  --timeseries FILE   Time series JSON file (required)
  --out FILE          Output file (default: governance_changes.json)
  --verbose           Enable verbose logging
  --help              Show this help message

Output Schema:
  {
    "version": "1.0",
    "generated_at": "...",
    "changes": [
      {
        "timestamp_utc": "...",
        "run_id": 123,
        "from_hash_short": "abcd1234",
        "to_hash_short": "efgh5678"
      }
    ],
    "change_count_7d": N,
    "change_count_30d": M,
    "current_hash_short": "...",
    "unique_hashes_30d": K
  }

Examples:
  $(basename "$0") --timeseries site/release-ops/redaction_metrics_timeseries.json
  $(basename "$0") --timeseries ts.json --out ./governance_changes.json
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timeseries)
            TIMESERIES_FILE="$2"
            shift 2
            ;;
        --out)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 2
            ;;
    esac
done

# Validate required arguments
if [[ -z "$TIMESERIES_FILE" ]]; then
    log_error "Missing required argument: --timeseries"
    exit 2
fi

if [[ ! -f "$TIMESERIES_FILE" ]]; then
    log_error "Time series file not found: ${TIMESERIES_FILE}"
    exit 2
fi

# Set default output file
if [[ -z "$OUTPUT_FILE" ]]; then
    OUTPUT_FILE="$(dirname "$TIMESERIES_FILE")/governance_changes.json"
fi

log_info "Detecting governance changes..."
log_verbose "Time series: ${TIMESERIES_FILE}"
log_verbose "Output: ${OUTPUT_FILE}"

# Calculate cutoff dates
NOW_EPOCH=$(date +%s)
CUTOFF_7D=$((NOW_EPOCH - 7 * 86400))
CUTOFF_30D=$((NOW_EPOCH - 30 * 86400))

# Process time series with jq
RESULT=$(jq --arg cutoff_7d "$CUTOFF_7D" --arg cutoff_30d "$CUTOFF_30D" '
  # Sort by timestamp (oldest first for change detection)
  (.series | sort_by(.timestamp_utc)) as $sorted |

  # Build change list
  (reduce range(1; $sorted | length) as $i (
    {changes: [], prev_hash: ($sorted[0].governance_hash // null)};

    . as $state |
    $sorted[$i] as $entry |
    ($entry.governance_hash // null) as $curr_hash |

    if $curr_hash != null and $state.prev_hash != null and $curr_hash != $state.prev_hash then
      $state | .changes += [{
        timestamp_utc: $entry.timestamp_utc,
        run_id: $entry.run_id,
        from_hash_short: ($state.prev_hash | if . then .[0:12] else null end),
        to_hash_short: ($curr_hash | .[0:12])
      }] | .prev_hash = $curr_hash
    elif $curr_hash != null then
      $state | .prev_hash = $curr_hash
    else
      $state
    end
  )) |

  # Get changes list
  .changes as $all_changes |

  # Get current hash from last entry with a hash
  ($sorted | last | .governance_hash // null) as $current_hash |

  # Filter changes by time window
  ($all_changes | map(select(
    (.timestamp_utc | fromdateiso8601) >= ($cutoff_7d | tonumber)
  )) | length) as $count_7d |

  ($all_changes | map(select(
    (.timestamp_utc | fromdateiso8601) >= ($cutoff_30d | tonumber)
  )) | length) as $count_30d |

  # Get unique hashes in 30d
  ([$sorted[] | select(
    (.timestamp_utc | fromdateiso8601) >= ($cutoff_30d | tonumber)
  ) | .governance_hash // empty] | unique | length) as $unique_30d |

  # Build output
  {
    version: "1.0",
    generated_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
    changes: ($all_changes | reverse),
    change_count_7d: $count_7d,
    change_count_30d: $count_30d,
    current_hash_short: (if $current_hash then $current_hash[0:12] else null end),
    current_hash_full: $current_hash,
    unique_hashes_30d: $unique_30d,
    total_changes: ($all_changes | length)
  }
' "$TIMESERIES_FILE")

# Write output
echo "$RESULT" | jq -S . > "$OUTPUT_FILE"

# Summary
CHANGE_COUNT_7D=$(echo "$RESULT" | jq -r '.change_count_7d')
CHANGE_COUNT_30D=$(echo "$RESULT" | jq -r '.change_count_30d')
CURRENT_HASH=$(echo "$RESULT" | jq -r '.current_hash_short // "none"')

log_info "=== Governance Changes Detected ==="
log_info "  Changes (7d):  ${CHANGE_COUNT_7D}"
log_info "  Changes (30d): ${CHANGE_COUNT_30D}"
log_info "  Current hash:  ${CURRENT_HASH}"
log_info "  Output: ${OUTPUT_FILE}"

echo "$OUTPUT_FILE"
