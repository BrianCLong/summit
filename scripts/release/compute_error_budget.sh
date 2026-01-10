#!/usr/bin/env bash
# compute_error_budget.sh
# Computes error budget consumption from time series data
#
# Usage:
#   ./scripts/release/compute_error_budget.sh \
#     --timeseries site/release-ops/redaction_metrics_timeseries.json \
#     --out site/release-ops/error_budget.json
#
# Authority: docs/ci/ERROR_BUDGET.md

set -euo pipefail

# Defaults
TIMESERIES_FILE=""
POLICY_FILE="docs/ci/ERROR_BUDGET_POLICY.yml"
STATE_FILE="docs/releases/_state/error_budget_state.json"
OUTPUT_FILE=""
GOVERNANCE_HASH=""
VERBOSE=false

usage() {
    cat << 'EOF'
Usage: compute_error_budget.sh [OPTIONS]

Compute error budget consumption from time series data.

Options:
  --timeseries FILE      Time series JSON file (required)
  --policy FILE          Error budget policy YAML (default: docs/ci/ERROR_BUDGET_POLICY.yml)
  --state FILE           State file for tracking (default: docs/releases/_state/error_budget_state.json)
  --governance-hash HASH SHA256 of governance lockfile (optional, auto-detected)
  --out FILE             Output JSON file (default: stdout)
  --verbose              Enable verbose logging
  --help                 Show this help

Examples:
  ./scripts/release/compute_error_budget.sh \
    --timeseries site/release-ops/redaction_metrics_timeseries.json \
    --out site/release-ops/error_budget.json
EOF
    exit 0
}

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[compute_error_budget] $*" >&2
    fi
}

error() {
    echo "[ERROR] $*" >&2
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --timeseries)
            TIMESERIES_FILE="$2"
            shift 2
            ;;
        --policy)
            POLICY_FILE="$2"
            shift 2
            ;;
        --state)
            STATE_FILE="$2"
            shift 2
            ;;
        --governance-hash)
            GOVERNANCE_HASH="$2"
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
            usage
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate required args
if [[ -z "$TIMESERIES_FILE" ]]; then
    error "Missing required --timeseries argument"
fi

if [[ ! -f "$TIMESERIES_FILE" ]]; then
    error "Time series file not found: $TIMESERIES_FILE"
fi

log "Computing error budget from: $TIMESERIES_FILE"

# Auto-detect governance hash if not provided
if [[ -z "$GOVERNANCE_HASH" ]]; then
    REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
    if [[ -n "$REPO_ROOT" && -f "$REPO_ROOT/docs/releases/_state/governance_lockfile.json" ]]; then
        GOVERNANCE_HASH=$(sha256sum "$REPO_ROOT/docs/releases/_state/governance_lockfile.json" 2>/dev/null | cut -d' ' -f1 || echo "")
        [[ -n "$GOVERNANCE_HASH" ]] && log "Auto-detected governance hash: ${GOVERNANCE_HASH:0:12}..."
    fi
fi

# Get current period (YYYY-MM)
CURRENT_PERIOD=$(date -u +"%Y-%m")
PERIOD_START="${CURRENT_PERIOD}-01T00:00:00Z"
log "Current period: $CURRENT_PERIOD (starts: $PERIOD_START)"

# Parse policy for budget allocations (simplified - using defaults if no yq)
# In production, use yq to parse YAML
ROLLBACK_BUDGET=3
FAIL_BUDGET=2
WARN_BUDGET=10

# Try to parse from policy if yq is available
if command -v yq &> /dev/null && [[ -f "$POLICY_FILE" ]]; then
    ROLLBACK_BUDGET=$(yq -r '.budgets.rollbacks.monthly_allocation // 3' "$POLICY_FILE" 2>/dev/null || echo 3)
    FAIL_BUDGET=$(yq -r '.budgets.fails.monthly_allocation // 2' "$POLICY_FILE" 2>/dev/null || echo 2)
    WARN_BUDGET=$(yq -r '.budgets.warns.monthly_allocation // 10' "$POLICY_FILE" 2>/dev/null || echo 10)
fi

log "Budget allocations - Rollbacks: $ROLLBACK_BUDGET, FAILs: $FAIL_BUDGET, WARNs: $WARN_BUDGET"

# Compute consumption from time series using jq
BUDGET_JSON=$(jq --arg period "$CURRENT_PERIOD" --arg period_start "$PERIOD_START" \
    --argjson rollback_budget "$ROLLBACK_BUDGET" \
    --argjson fail_budget "$FAIL_BUDGET" \
    --argjson warn_budget "$WARN_BUDGET" \
    --arg governance_hash "$GOVERNANCE_HASH" '
# Helper function to check if timestamp is in current period
def in_period($ts; $start):
    ($ts | split("T")[0] | split("-")[0:2] | join("-")) as $ts_period |
    ($start | split("T")[0] | split("-")[0:2] | join("-")) as $start_period |
    $ts_period == $start_period;

# Filter series to current period
[.series[] | select(in_period(.timestamp_utc; $period_start))] as $period_entries |

# Count events
($period_entries | map(select(.deployment_status == "ROLLED_BACK")) | length) as $rollbacks_consumed |
($period_entries | map(select(.health_level == "FAIL")) | length) as $fails_consumed |
($period_entries | map(select(.health_level == "WARN")) | length) as $warns_consumed |

# Calculate remaining
($rollback_budget - $rollbacks_consumed) as $rollbacks_remaining |
($fail_budget - $fails_consumed) as $fails_remaining |
($warn_budget - $warns_consumed) as $warns_remaining |

# Determine tier
(
    if $rollbacks_remaining >= 2 and $fails_remaining >= 1 and $warns_remaining >= 5 then
        "GREEN"
    elif $rollbacks_remaining >= 1 and $fails_remaining >= 1 and $warns_remaining >= 2 then
        "YELLOW"
    else
        "RED"
    end
) as $tier |

# Check exhaustion
($rollbacks_remaining <= 0) as $rollbacks_exhausted |
($fails_remaining <= 0) as $fails_exhausted |
($warns_remaining <= 0) as $warns_exhausted |
($rollbacks_exhausted or $fails_exhausted or $warns_exhausted) as $any_exhausted |

# Calculate percentages
(if $rollback_budget > 0 then (($rollback_budget - $rollbacks_remaining) / $rollback_budget * 100) else 0 end) as $rollback_consumed_pct |
(if $fail_budget > 0 then (($fail_budget - $fails_remaining) / $fail_budget * 100) else 0 end) as $fail_consumed_pct |
(if $warn_budget > 0 then (($warn_budget - $warns_remaining) / $warn_budget * 100) else 0 end) as $warn_consumed_pct |

# Get recent events for context
[
    $period_entries[] |
    select(.deployment_status == "ROLLED_BACK" or .health_level == "FAIL" or .health_level == "WARN") |
    {
        date: (.timestamp_utc | split("T")[0]),
        run_id: .run_id,
        type: (
            if .deployment_status == "ROLLED_BACK" then "ROLLBACK"
            elif .health_level == "FAIL" then "FAIL"
            else "WARN"
            end
        ),
        reason: .rollback_reason
    }
] | sort_by(.date) | reverse | .[0:10] as $recent_events |

# Days remaining in period
(now | strftime("%Y-%m-%d") | split("-")[2] | tonumber) as $current_day |
(
    # Approximate days in month
    if ($period | split("-")[1] | tonumber) | . == 2 then 28
    elif . == 4 or . == 6 or . == 9 or . == 11 then 30
    else 31
    end
) as $days_in_month |
($days_in_month - $current_day) as $days_remaining |

# Burn rate (events per day so far)
(if $current_day > 0 then ($rollbacks_consumed / $current_day) else 0 end) as $rollback_burn_rate |
(if $current_day > 0 then ($fails_consumed / $current_day) else 0 end) as $fail_burn_rate |
(if $current_day > 0 then ($warns_consumed / $current_day) else 0 end) as $warn_burn_rate |

# Projected end-of-month consumption
(($rollback_burn_rate * $days_in_month) | floor) as $rollback_projected |
(($fail_burn_rate * $days_in_month) | floor) as $fail_projected |
(($warn_burn_rate * $days_in_month) | floor) as $warn_projected |

# Build output
{
    version: "1.1",
    generated_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
    governance_hash: (if $governance_hash != "" then $governance_hash else null end),
    period: {
        month: $period,
        start: $period_start,
        days_elapsed: $current_day,
        days_remaining: $days_remaining
    },
    budgets: {
        rollbacks: {
            allocated: $rollback_budget,
            consumed: $rollbacks_consumed,
            remaining: (if $rollbacks_remaining < 0 then 0 else $rollbacks_remaining end),
            consumed_pct: ($rollback_consumed_pct | . * 100 | floor / 100),
            exhausted: $rollbacks_exhausted,
            burn_rate_per_day: ($rollback_burn_rate | . * 100 | floor / 100),
            projected_eom: $rollback_projected
        },
        fails: {
            allocated: $fail_budget,
            consumed: $fails_consumed,
            remaining: (if $fails_remaining < 0 then 0 else $fails_remaining end),
            consumed_pct: ($fail_consumed_pct | . * 100 | floor / 100),
            exhausted: $fails_exhausted,
            burn_rate_per_day: ($fail_burn_rate | . * 100 | floor / 100),
            projected_eom: $fail_projected
        },
        warns: {
            allocated: $warn_budget,
            consumed: $warns_consumed,
            remaining: (if $warns_remaining < 0 then 0 else $warns_remaining end),
            consumed_pct: ($warn_consumed_pct | . * 100 | floor / 100),
            exhausted: $warns_exhausted,
            burn_rate_per_day: ($warn_burn_rate | . * 100 | floor / 100),
            projected_eom: $warn_projected
        }
    },
    tier: $tier,
    tier_description: (
        if $tier == "GREEN" then "Healthy - budget available"
        elif $tier == "YELLOW" then "Caution - budget running low"
        else "Critical - budget nearly exhausted"
        end
    ),
    exhaustion: {
        any_exhausted: $any_exhausted,
        rollbacks_exhausted: $rollbacks_exhausted,
        fails_exhausted: $fails_exhausted,
        warns_exhausted: $warns_exhausted
    },
    threshold_adjustments: {
        active: ($tier != "GREEN"),
        multiplier: (
            if $tier == "RED" then 0.75
            elif $tier == "YELLOW" then 0.9
            else 1.0
            end
        ),
        additional_review_required: ($tier == "RED")
    },
    projections: {
        rollback_will_exhaust: ($rollback_projected > $rollback_budget),
        fail_will_exhaust: ($fail_projected > $fail_budget),
        warn_will_exhaust: ($warn_projected > $warn_budget)
    },
    recent_events: $recent_events,
    entries_in_period: ($period_entries | length)
}
' "$TIMESERIES_FILE")

# Output result
if [[ -n "$OUTPUT_FILE" ]]; then
    mkdir -p "$(dirname "$OUTPUT_FILE")"
    echo "$BUDGET_JSON" > "$OUTPUT_FILE"
    log "Wrote error budget to: $OUTPUT_FILE"

    # Log summary
    TIER=$(echo "$BUDGET_JSON" | jq -r '.tier')
    ROLLBACK_REMAINING=$(echo "$BUDGET_JSON" | jq -r '.budgets.rollbacks.remaining')
    FAIL_REMAINING=$(echo "$BUDGET_JSON" | jq -r '.budgets.fails.remaining')
    WARN_REMAINING=$(echo "$BUDGET_JSON" | jq -r '.budgets.warns.remaining')

    log "Tier: $TIER"
    log "Remaining - Rollbacks: $ROLLBACK_REMAINING, FAILs: $FAIL_REMAINING, WARNs: $WARN_REMAINING"
else
    echo "$BUDGET_JSON"
fi
