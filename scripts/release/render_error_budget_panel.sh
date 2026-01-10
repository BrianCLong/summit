#!/usr/bin/env bash
# render_error_budget_panel.sh
# Renders error budget panel as HTML and Markdown
#
# Usage:
#   ./scripts/release/render_error_budget_panel.sh \
#     --budget-json site/release-ops/error_budget.json
#
# Authority: docs/ci/ERROR_BUDGET.md

set -euo pipefail

# Defaults
BUDGET_JSON=""
OUT_DIR="site/release-ops"
VERBOSE=false

usage() {
    cat << 'EOF'
Usage: render_error_budget_panel.sh [OPTIONS]

Render error budget panel as HTML and Markdown.

Options:
  --budget-json FILE  Error budget JSON file (required)
  --out-dir DIR       Output directory (default: site/release-ops)
  --verbose           Enable verbose logging
  --help              Show this help

Outputs:
  - error_budget.html    HTML panel page
  - error_budget.md      Markdown panel page
EOF
    exit 0
}

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[render_error_budget_panel] $*" >&2
    fi
}

error() {
    echo "[ERROR] $*" >&2
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --budget-json)
            BUDGET_JSON="$2"
            shift 2
            ;;
        --out-dir)
            OUT_DIR="$2"
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

# Validate
if [[ -z "$BUDGET_JSON" ]]; then
    error "Missing required --budget-json argument"
fi

if [[ ! -f "$BUDGET_JSON" ]]; then
    error "Budget JSON not found: $BUDGET_JSON"
fi

mkdir -p "$OUT_DIR"

log "Rendering error budget panel from: $BUDGET_JSON"

# Extract data
TIER=$(jq -r '.tier' "$BUDGET_JSON")
TIER_DESC=$(jq -r '.tier_description' "$BUDGET_JSON")
PERIOD=$(jq -r '.period.month' "$BUDGET_JSON")
DAYS_ELAPSED=$(jq -r '.period.days_elapsed' "$BUDGET_JSON")
DAYS_REMAINING=$(jq -r '.period.days_remaining' "$BUDGET_JSON")
GENERATED=$(jq -r '.generated_at' "$BUDGET_JSON")
GOVERNANCE_HASH=$(jq -r '.governance_hash // empty' "$BUDGET_JSON")
ANY_EXHAUSTED=$(jq -r '.exhaustion.any_exhausted' "$BUDGET_JSON")
MULTIPLIER=$(jq -r '.threshold_adjustments.multiplier' "$BUDGET_JSON")
ADDITIONAL_REVIEW=$(jq -r '.threshold_adjustments.additional_review_required' "$BUDGET_JSON")

# Budget values
ROLLBACK_ALLOC=$(jq -r '.budgets.rollbacks.allocated' "$BUDGET_JSON")
ROLLBACK_CONSUMED=$(jq -r '.budgets.rollbacks.consumed' "$BUDGET_JSON")
ROLLBACK_REMAINING=$(jq -r '.budgets.rollbacks.remaining' "$BUDGET_JSON")
ROLLBACK_PCT=$(jq -r '.budgets.rollbacks.consumed_pct' "$BUDGET_JSON")
ROLLBACK_EXHAUSTED=$(jq -r '.budgets.rollbacks.exhausted' "$BUDGET_JSON")
ROLLBACK_PROJECTED=$(jq -r '.budgets.rollbacks.projected_eom' "$BUDGET_JSON")

FAIL_ALLOC=$(jq -r '.budgets.fails.allocated' "$BUDGET_JSON")
FAIL_CONSUMED=$(jq -r '.budgets.fails.consumed' "$BUDGET_JSON")
FAIL_REMAINING=$(jq -r '.budgets.fails.remaining' "$BUDGET_JSON")
FAIL_PCT=$(jq -r '.budgets.fails.consumed_pct' "$BUDGET_JSON")
FAIL_EXHAUSTED=$(jq -r '.budgets.fails.exhausted' "$BUDGET_JSON")
FAIL_PROJECTED=$(jq -r '.budgets.fails.projected_eom' "$BUDGET_JSON")

WARN_ALLOC=$(jq -r '.budgets.warns.allocated' "$BUDGET_JSON")
WARN_CONSUMED=$(jq -r '.budgets.warns.consumed' "$BUDGET_JSON")
WARN_REMAINING=$(jq -r '.budgets.warns.remaining' "$BUDGET_JSON")
WARN_PCT=$(jq -r '.budgets.warns.consumed_pct' "$BUDGET_JSON")
WARN_EXHAUSTED=$(jq -r '.budgets.warns.exhausted' "$BUDGET_JSON")
WARN_PROJECTED=$(jq -r '.budgets.warns.projected_eom' "$BUDGET_JSON")

# Determine colors
tier_color() {
    case "$1" in
        GREEN)  echo "#28a745" ;;
        YELLOW) echo "#ffc107" ;;
        RED)    echo "#dc3545" ;;
        *)      echo "#6c757d" ;;
    esac
}

tier_bg() {
    case "$1" in
        GREEN)  echo "#d4edda" ;;
        YELLOW) echo "#fff3cd" ;;
        RED)    echo "#f8d7da" ;;
        *)      echo "#e9ecef" ;;
    esac
}

budget_bar_color() {
    local pct=$1
    if (( $(echo "$pct >= 90" | bc -l 2>/dev/null || echo 0) )); then
        echo "#dc3545"
    elif (( $(echo "$pct >= 70" | bc -l 2>/dev/null || echo 0) )); then
        echo "#ffc107"
    else
        echo "#28a745"
    fi
}

# Generate progress bar HTML
progress_bar() {
    local consumed=$1
    local allocated=$2
    local pct=$3
    local color

    # Determine color based on percentage
    if (( $(echo "$pct >= 90" | bc -l 2>/dev/null || echo 0) )); then
        color="#dc3545"
    elif (( $(echo "$pct >= 70" | bc -l 2>/dev/null || echo 0) )); then
        color="#ffc107"
    else
        color="#28a745"
    fi

    # Cap at 100% for display
    local display_pct=$pct
    if (( $(echo "$pct > 100" | bc -l 2>/dev/null || echo 0) )); then
        display_pct=100
    fi

    cat << EOF
<div style="background: #e9ecef; border-radius: 4px; height: 20px; position: relative; overflow: hidden;">
    <div style="background: ${color}; height: 100%; width: ${display_pct}%; transition: width 0.3s;"></div>
    <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 11px; font-weight: bold;">${consumed}/${allocated}</span>
</div>
EOF
}

# ASCII progress bar for markdown
ascii_bar() {
    local pct=$1
    local width=20
    local filled

    # Cap at 100
    if (( $(echo "$pct > 100" | bc -l 2>/dev/null || echo 0) )); then
        pct=100
    fi

    filled=$(echo "$pct * $width / 100" | bc 2>/dev/null || echo 0)
    local empty=$((width - filled))

    printf '['
    printf '%*s' "$filled" '' | tr ' ' '#'
    printf '%*s' "$empty" '' | tr ' ' '-'
    printf '] %s%%' "$pct"
}

# Generate HTML
log "Generating HTML..."

TIER_COLOR=$(tier_color "$TIER")
TIER_BG=$(tier_bg "$TIER")

cat > "$OUT_DIR/error_budget.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error Budget - ${PERIOD}</title>
    <style>
        :root {
            --green: #28a745;
            --yellow: #ffc107;
            --red: #dc3545;
            --gray: #6c757d;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
            padding: 20px;
            color: #212529;
        }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { margin-bottom: 8px; }
        .subtitle { color: #6c757d; margin-bottom: 20px; }

        .tier-banner {
            background: ${TIER_BG};
            border: 2px solid ${TIER_COLOR};
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        .tier-badge {
            display: inline-block;
            background: ${TIER_COLOR};
            color: white;
            padding: 8px 24px;
            border-radius: 20px;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .tier-desc { font-size: 14px; color: #495057; }

        .period-info {
            display: flex;
            justify-content: space-around;
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .period-stat { text-align: center; }
        .period-value { font-size: 24px; font-weight: bold; color: #212529; }
        .period-label { font-size: 12px; color: #6c757d; }

        .budget-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .budget-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .budget-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .budget-title { font-size: 18px; font-weight: 600; }
        .budget-remaining {
            font-size: 14px;
            padding: 4px 12px;
            border-radius: 12px;
        }
        .remaining-ok { background: #d4edda; color: #155724; }
        .remaining-low { background: #fff3cd; color: #856404; }
        .remaining-exhausted { background: #f8d7da; color: #721c24; }

        .progress-container { margin-bottom: 15px; }
        .progress-bar {
            background: #e9ecef;
            border-radius: 4px;
            height: 24px;
            position: relative;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            transition: width 0.3s;
        }
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 12px;
            font-weight: bold;
            color: #212529;
        }

        .budget-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 13px;
        }
        .stat-item { display: flex; justify-content: space-between; }
        .stat-label { color: #6c757d; }
        .stat-value { font-weight: 500; }

        .alerts-section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .alert-item {
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            font-size: 14px;
        }
        .alert-warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .alert-danger { background: #f8d7da; border-left: 4px solid #dc3545; }
        .alert-info { background: #d1ecf1; border-left: 4px solid #17a2b8; }

        .events-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .events-table th, .events-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        .events-table th { background: #f8f9fa; font-weight: 600; }
        .event-type {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
        }
        .event-rollback { background: #f8d7da; color: #721c24; }
        .event-fail { background: #f8d7da; color: #721c24; }
        .event-warn { background: #fff3cd; color: #856404; }

        .footer {
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            margin-top: 20px;
        }
        .nav-links { margin-bottom: 20px; }
        .nav-links a {
            color: #007bff;
            text-decoration: none;
            margin-right: 15px;
        }
        .nav-links a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav-links">
            <a href="index.html">Dashboard</a>
            <a href="release_ops_slo.html">SLO Report</a>
            <a href="redaction_metrics_trend.html">Trends</a>
        </div>

        <h1>Error Budget</h1>
        <p class="subtitle">Release Operations - ${PERIOD}</p>

        <div class="tier-banner">
            <div class="tier-badge">${TIER}</div>
            <div class="tier-desc">${TIER_DESC}</div>
        </div>

        <div class="period-info">
            <div class="period-stat">
                <div class="period-value">${DAYS_ELAPSED}</div>
                <div class="period-label">Days Elapsed</div>
            </div>
            <div class="period-stat">
                <div class="period-value">${DAYS_REMAINING}</div>
                <div class="period-label">Days Remaining</div>
            </div>
            <div class="period-stat">
                <div class="period-value">${MULTIPLIER}x</div>
                <div class="period-label">Threshold Multiplier</div>
            </div>
        </div>

        <div class="budget-grid">
            <!-- Rollbacks Budget -->
            <div class="budget-card">
                <div class="budget-header">
                    <span class="budget-title">Rollbacks</span>
                    <span class="budget-remaining $([ "$ROLLBACK_EXHAUSTED" == "true" ] && echo 'remaining-exhausted' || ([ "$ROLLBACK_REMAINING" -le 1 ] && echo 'remaining-low' || echo 'remaining-ok'))">
                        ${ROLLBACK_REMAINING} remaining
                    </span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: $([ "$ROLLBACK_PCT" -gt 100 ] && echo 100 || echo "$ROLLBACK_PCT")%; background: $([ "$ROLLBACK_PCT" -ge 90 ] && echo '#dc3545' || ([ "$ROLLBACK_PCT" -ge 70 ] && echo '#ffc107' || echo '#28a745'));"></div>
                        <span class="progress-text">${ROLLBACK_CONSUMED} / ${ROLLBACK_ALLOC}</span>
                    </div>
                </div>
                <div class="budget-stats">
                    <div class="stat-item">
                        <span class="stat-label">Consumed</span>
                        <span class="stat-value">${ROLLBACK_PCT}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Projected EOM</span>
                        <span class="stat-value">${ROLLBACK_PROJECTED}</span>
                    </div>
                </div>
            </div>

            <!-- FAILs Budget -->
            <div class="budget-card">
                <div class="budget-header">
                    <span class="budget-title">FAILs</span>
                    <span class="budget-remaining $([ "$FAIL_EXHAUSTED" == "true" ] && echo 'remaining-exhausted' || ([ "$FAIL_REMAINING" -le 1 ] && echo 'remaining-low' || echo 'remaining-ok'))">
                        ${FAIL_REMAINING} remaining
                    </span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: $([ "$FAIL_PCT" -gt 100 ] && echo 100 || echo "$FAIL_PCT")%; background: $([ "$FAIL_PCT" -ge 90 ] && echo '#dc3545' || ([ "$FAIL_PCT" -ge 70 ] && echo '#ffc107' || echo '#28a745'));"></div>
                        <span class="progress-text">${FAIL_CONSUMED} / ${FAIL_ALLOC}</span>
                    </div>
                </div>
                <div class="budget-stats">
                    <div class="stat-item">
                        <span class="stat-label">Consumed</span>
                        <span class="stat-value">${FAIL_PCT}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Projected EOM</span>
                        <span class="stat-value">${FAIL_PROJECTED}</span>
                    </div>
                </div>
            </div>

            <!-- WARNs Budget -->
            <div class="budget-card">
                <div class="budget-header">
                    <span class="budget-title">WARNs</span>
                    <span class="budget-remaining $([ "$WARN_EXHAUSTED" == "true" ] && echo 'remaining-exhausted' || ([ "$WARN_REMAINING" -le 2 ] && echo 'remaining-low' || echo 'remaining-ok'))">
                        ${WARN_REMAINING} remaining
                    </span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: $([ "$WARN_PCT" -gt 100 ] && echo 100 || echo "$WARN_PCT")%; background: $([ "$WARN_PCT" -ge 90 ] && echo '#dc3545' || ([ "$WARN_PCT" -ge 70 ] && echo '#ffc107' || echo '#28a745'));"></div>
                        <span class="progress-text">${WARN_CONSUMED} / ${WARN_ALLOC}</span>
                    </div>
                </div>
                <div class="budget-stats">
                    <div class="stat-item">
                        <span class="stat-label">Consumed</span>
                        <span class="stat-value">${WARN_PCT}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Projected EOM</span>
                        <span class="stat-value">${WARN_PROJECTED}</span>
                    </div>
                </div>
            </div>
        </div>
EOF

# Add alerts section if needed
if [[ "$ANY_EXHAUSTED" == "true" ]] || [[ "$TIER" == "RED" ]] || [[ "$ADDITIONAL_REVIEW" == "true" ]]; then
    cat >> "$OUT_DIR/error_budget.html" << EOF
        <div class="alerts-section">
            <h3 style="margin-bottom: 15px;">Active Alerts</h3>
EOF

    if [[ "$ROLLBACK_EXHAUSTED" == "true" ]]; then
        cat >> "$OUT_DIR/error_budget.html" << EOF
            <div class="alert-item alert-danger">
                <strong>Rollback Budget Exhausted:</strong> All ${ROLLBACK_ALLOC} rollbacks consumed. Additional approval required for next publish.
            </div>
EOF
    fi

    if [[ "$FAIL_EXHAUSTED" == "true" ]]; then
        cat >> "$OUT_DIR/error_budget.html" << EOF
            <div class="alert-item alert-danger">
                <strong>FAIL Budget Exhausted:</strong> All ${FAIL_ALLOC} FAILs consumed. Forbidden pattern tolerance set to zero.
            </div>
EOF
    fi

    if [[ "$WARN_EXHAUSTED" == "true" ]]; then
        cat >> "$OUT_DIR/error_budget.html" << EOF
            <div class="alert-item alert-warning">
                <strong>WARN Budget Exhausted:</strong> All ${WARN_ALLOC} WARNs consumed. WARN thresholds reduced by 30%.
            </div>
EOF
    fi

    if [[ "$ADDITIONAL_REVIEW" == "true" ]]; then
        cat >> "$OUT_DIR/error_budget.html" << EOF
            <div class="alert-item alert-info">
                <strong>Additional Review Required:</strong> Budget tier is RED. Platform Engineering review required for publishes.
            </div>
EOF
    fi

    cat >> "$OUT_DIR/error_budget.html" << EOF
        </div>
EOF
fi

# Add recent events table
cat >> "$OUT_DIR/error_budget.html" << EOF
        <div class="alerts-section">
            <h3 style="margin-bottom: 15px;">Recent Budget Events</h3>
EOF

EVENT_COUNT=$(jq '.recent_events | length' "$BUDGET_JSON")
if [[ "$EVENT_COUNT" -gt 0 ]]; then
    cat >> "$OUT_DIR/error_budget.html" << EOF
            <table class="events-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Run ID</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
EOF

    jq -r '.recent_events[] | "\(.date)|\(.type)|\(.run_id // "-")|\(.reason // "-")"' "$BUDGET_JSON" | while IFS='|' read -r date type run_id reason; do
        type_class="event-warn"
        [[ "$type" == "ROLLBACK" ]] && type_class="event-rollback"
        [[ "$type" == "FAIL" ]] && type_class="event-fail"

        cat >> "$OUT_DIR/error_budget.html" << EOF
                    <tr>
                        <td>${date}</td>
                        <td><span class="event-type ${type_class}">${type}</span></td>
                        <td>${run_id}</td>
                        <td>${reason}</td>
                    </tr>
EOF
    done

    cat >> "$OUT_DIR/error_budget.html" << EOF
                </tbody>
            </table>
EOF
else
    cat >> "$OUT_DIR/error_budget.html" << EOF
            <p style="color: #6c757d; text-align: center; padding: 20px;">No budget events this period.</p>
EOF
fi

cat >> "$OUT_DIR/error_budget.html" << EOF
        </div>

        <div class="footer">
            Generated: ${GENERATED}$([ -n "$GOVERNANCE_HASH" ] && echo "<br>Gov: <code title=\"${GOVERNANCE_HASH}\">${GOVERNANCE_HASH:0:12}...</code>")<br>
            <a href="error_budget.json">Raw JSON</a> |
            <a href="error_budget.md">Markdown</a>
        </div>
    </div>
</body>
</html>
EOF

log "Generated: $OUT_DIR/error_budget.html"

# Generate Markdown
log "Generating Markdown..."

GOV_LINE=""
if [[ -n "$GOVERNANCE_HASH" ]]; then
    GOV_LINE="**Governance:** \`${GOVERNANCE_HASH:0:12}...\`"
fi

cat > "$OUT_DIR/error_budget.md" << EOF
# Error Budget - ${PERIOD}

**Status:** ${TIER} - ${TIER_DESC}
**Generated:** ${GENERATED}
${GOV_LINE}

---

## Period Summary

| Metric | Value |
|--------|-------|
| Days Elapsed | ${DAYS_ELAPSED} |
| Days Remaining | ${DAYS_REMAINING} |
| Threshold Multiplier | ${MULTIPLIER}x |
| Additional Review Required | ${ADDITIONAL_REVIEW} |

---

## Budget Status

### Rollbacks

$(ascii_bar "$ROLLBACK_PCT")

| Metric | Value |
|--------|-------|
| Allocated | ${ROLLBACK_ALLOC} |
| Consumed | ${ROLLBACK_CONSUMED} |
| Remaining | ${ROLLBACK_REMAINING} |
| Consumed % | ${ROLLBACK_PCT}% |
| Projected EOM | ${ROLLBACK_PROJECTED} |
| Exhausted | ${ROLLBACK_EXHAUSTED} |

### FAILs

$(ascii_bar "$FAIL_PCT")

| Metric | Value |
|--------|-------|
| Allocated | ${FAIL_ALLOC} |
| Consumed | ${FAIL_CONSUMED} |
| Remaining | ${FAIL_REMAINING} |
| Consumed % | ${FAIL_PCT}% |
| Projected EOM | ${FAIL_PROJECTED} |
| Exhausted | ${FAIL_EXHAUSTED} |

### WARNs

$(ascii_bar "$WARN_PCT")

| Metric | Value |
|--------|-------|
| Allocated | ${WARN_ALLOC} |
| Consumed | ${WARN_CONSUMED} |
| Remaining | ${WARN_REMAINING} |
| Consumed % | ${WARN_PCT}% |
| Projected EOM | ${WARN_PROJECTED} |
| Exhausted | ${WARN_EXHAUSTED} |

---

## Alerts

EOF

if [[ "$ANY_EXHAUSTED" == "true" ]] || [[ "$TIER" == "RED" ]]; then
    if [[ "$ROLLBACK_EXHAUSTED" == "true" ]]; then
        echo "- **CRITICAL:** Rollback budget exhausted. Additional approval required." >> "$OUT_DIR/error_budget.md"
    fi
    if [[ "$FAIL_EXHAUSTED" == "true" ]]; then
        echo "- **CRITICAL:** FAIL budget exhausted. Forbidden pattern tolerance at zero." >> "$OUT_DIR/error_budget.md"
    fi
    if [[ "$WARN_EXHAUSTED" == "true" ]]; then
        echo "- **WARNING:** WARN budget exhausted. Thresholds reduced by 30%." >> "$OUT_DIR/error_budget.md"
    fi
    if [[ "$ADDITIONAL_REVIEW" == "true" ]]; then
        echo "- **INFO:** Additional review required due to RED tier." >> "$OUT_DIR/error_budget.md"
    fi
else
    echo "No active alerts." >> "$OUT_DIR/error_budget.md"
fi

cat >> "$OUT_DIR/error_budget.md" << EOF

---

## Recent Events

EOF

if [[ "$EVENT_COUNT" -gt 0 ]]; then
    echo "| Date | Type | Run ID | Reason |" >> "$OUT_DIR/error_budget.md"
    echo "|------|------|--------|--------|" >> "$OUT_DIR/error_budget.md"
    jq -r '.recent_events[] | "| \(.date) | \(.type) | \(.run_id // "-") | \(.reason // "-") |"' "$BUDGET_JSON" >> "$OUT_DIR/error_budget.md"
else
    echo "No budget events this period." >> "$OUT_DIR/error_budget.md"
fi

cat >> "$OUT_DIR/error_budget.md" << EOF

---

## References

- [Error Budget Policy](../../docs/ci/ERROR_BUDGET_POLICY.yml)
- [SLO Report](release_ops_slo.html)
- [Trend View](redaction_metrics_trend.html)
- [Raw JSON](error_budget.json)

---

*Generated automatically by Release Ops*
EOF

log "Generated: $OUT_DIR/error_budget.md"
echo "Rendered error budget panel: $OUT_DIR/error_budget.{html,md}"
