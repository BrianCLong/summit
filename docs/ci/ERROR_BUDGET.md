# Release Ops Error Budget

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

The Error Budget system tracks monthly "allowances" for rollbacks, FAILs, and WARNs. When budget is consumed, governance automatically tightens to prevent further incidents. This creates a self-regulating system that balances release velocity with stability.

### Key Principles

1. **Budget-Based Governance**: Teams have a fixed monthly budget for incidents
2. **Auto-Tighten Only**: The system automatically tightens governance when budget runs low, but never auto-loosens
3. **Manual Reset Required**: Only humans can reset tight mode via PR
4. **Transparency**: All budget status is published to Pages (counts-only)

---

## Budget Allocations

Default monthly allocations (configurable in policy):

| Budget    | Monthly Allocation | Description                              |
| --------- | ------------------ | ---------------------------------------- |
| Rollbacks | 3                  | Maximum rollback events per month        |
| FAILs     | 2                  | Maximum FAIL events (forbidden patterns) |
| WARNs     | 10                 | Maximum WARN events (elevated redaction) |

---

## Budget Tiers

### GREEN

**Description:** Healthy - budget available

**Criteria:**

- Rollback remaining ≥ 2
- FAIL remaining ≥ 1
- WARN remaining ≥ 5

**Actions:** None - normal operations

### YELLOW

**Description:** Caution - budget running low

**Criteria:**

- Rollback remaining ≥ 1
- FAIL remaining ≥ 1
- WARN remaining ≥ 2

**Actions:**

- Threshold multiplier: 0.9x (10% stricter)
- Warning issue created

### RED

**Description:** Critical - budget nearly exhausted

**Criteria:**

- Below YELLOW thresholds

**Actions:**

- Threshold multiplier: 0.75x (25% stricter)
- Additional review required
- Emergency issue created
- Tight mode activated

---

## Exhaustion Actions

When a specific budget is exhausted (reaches 0):

### Rollback Budget Exhausted

- Additional approval required for all publishes
- Tight mode activated
- P1 issue created

### FAIL Budget Exhausted

- Forbidden pattern tolerance set to zero
- Any FAIL immediately blocks publish
- P1 issue created

### WARN Budget Exhausted

- WARN thresholds reduced by 30%
- Additional scrutiny on elevated metrics
- P2 issue created

---

## Tight Mode

Tight mode is a governance state that indicates increased scrutiny is required.

### When Tight Mode Activates

- Budget tier reaches RED
- Any budget is exhausted
- Emergency conditions detected

### What Tight Mode Does (Phase 1 - Advisory)

- Creates visibility issue
- Sets flag in `governance_tight_mode.json`
- Documents reason and timestamp

### What Tight Mode Does (Phase 2 - Enforcement)

- Requires environment approval for WARN publishes
- May block non-hotfix releases (freeze mode)
- Increases check frequency

### Clearing Tight Mode

Tight mode can only be cleared manually:

1. Investigate and resolve underlying issues
2. Create a PR that modifies `docs/releases/_state/governance_tight_mode.json`:
   ```json
   {
     "tight_mode": false,
     "set_at": "2026-01-08T12:00:00Z",
     "reason": "manual_reset_after_remediation",
     "set_by": "human",
     "note": "Budget issues resolved, see PR #1234"
   }
   ```
3. Get PR approved and merged
4. Budget will reset naturally at start of next month

---

## Output Files

### error_budget.json

Raw budget metrics data.

```json
{
  "version": "1.0",
  "generated_at": "2026-01-08T14:32:56Z",
  "period": {
    "month": "2026-01",
    "start": "2026-01-01T00:00:00Z",
    "days_elapsed": 8,
    "days_remaining": 23
  },
  "budgets": {
    "rollbacks": {
      "allocated": 3,
      "consumed": 1,
      "remaining": 2,
      "consumed_pct": 33.33,
      "exhausted": false,
      "burn_rate_per_day": 0.13,
      "projected_eom": 4
    },
    "fails": { ... },
    "warns": { ... }
  },
  "tier": "GREEN",
  "tier_description": "Healthy - budget available",
  "exhaustion": {
    "any_exhausted": false,
    "rollbacks_exhausted": false,
    "fails_exhausted": false,
    "warns_exhausted": false
  },
  "threshold_adjustments": {
    "active": false,
    "multiplier": 1.0,
    "additional_review_required": false
  },
  "projections": {
    "rollback_will_exhaust": true,
    "fail_will_exhaust": false,
    "warn_will_exhaust": false
  },
  "recent_events": [...]
}
```

### error_budget.html

HTML panel with:

- Tier status banner (GREEN/YELLOW/RED)
- Progress bars for each budget
- Exhaustion alerts
- Recent events table
- Links to related reports

### error_budget.md

Markdown version for internal linking and review.

---

## Scripts Reference

### compute_error_budget.sh

Computes budget consumption from time series data.

```bash
# Basic usage
./scripts/release/compute_error_budget.sh \
  --timeseries site/release-ops/redaction_metrics_timeseries.json \
  --out site/release-ops/error_budget.json

# With verbose output
./scripts/release/compute_error_budget.sh \
  --timeseries timeseries.json \
  --out budget.json \
  --verbose
```

| Option         | Description                        |
| -------------- | ---------------------------------- |
| `--timeseries` | Time series JSON file (required)   |
| `--policy`     | Budget policy YAML file (optional) |
| `--out`        | Output JSON file (default: stdout) |
| `--verbose`    | Enable verbose logging             |

### render_error_budget_panel.sh

Renders budget panel as HTML and Markdown.

```bash
# Basic usage
./scripts/release/render_error_budget_panel.sh \
  --budget-json site/release-ops/error_budget.json

# Custom output directory
./scripts/release/render_error_budget_panel.sh \
  --budget-json budget.json \
  --out-dir public/ \
  --verbose
```

| Option          | Description                                  |
| --------------- | -------------------------------------------- |
| `--budget-json` | Budget JSON file (required)                  |
| `--out-dir`     | Output directory (default: site/release-ops) |
| `--verbose`     | Enable verbose logging                       |

---

## Integration

### Build Pipeline

Budget computation is integrated into `build_release_ops_site.sh`:

```
1. Update time series
2. Render trend pages
3. Compute SLO JSON
4. Render SLO pages
5. Compute Error Budget ← NEW
6. Render Budget Panel  ← NEW
7. Create index page (with budget link)
8. Final verification
```

### Alert Workflow

The `error-budget-alerts.yml` workflow:

- Triggers after Pages publish
- Checks budget tier and exhaustion
- Creates/updates deduped issues
- Sets tight mode flag when needed
- Auto-closes issues when budget returns to GREEN

---

## Adjusting Budgets

### Via Policy File

Edit `docs/ci/ERROR_BUDGET_POLICY.yml`:

```yaml
budgets:
  rollbacks:
    monthly_allocation: 3 # Adjust as needed
  fails:
    monthly_allocation: 2 # Adjust as needed
  warns:
    monthly_allocation: 10 # Adjust as needed
```

### Safety Guidelines

When adjusting budgets:

1. **Document the change**: Include rationale in commit message
2. **Review historical data**: Ensure new budgets are appropriate
3. **Consider SLO alignment**: Budgets should support SLO targets
4. **Team alignment**: Discuss significant changes with stakeholders
5. **Monitor after change**: Watch for unexpected tightening

---

## Burn Rate and Projections

The system calculates:

### Burn Rate

Events consumed per day so far this period:

```
burn_rate = consumed / days_elapsed
```

### End-of-Month Projection

Projected consumption if current rate continues:

```
projected_eom = burn_rate * days_in_month
```

### Early Warning

If `projected_eom > allocated`, the budget may exhaust before month end. This triggers early warnings even if current remaining is acceptable.

---

## Example Budget Panel

| Budget    | Allocated | Consumed | Remaining | Status |
| --------- | --------- | -------- | --------- | ------ |
| Rollbacks | 3         | 1        | 2         | ✅     |
| FAILs     | 2         | 0        | 2         | ✅     |
| WARNs     | 10        | 4        | 6         | ✅     |

**Tier:** GREEN
**Days Remaining:** 23
**Threshold Multiplier:** 1.0x

---

## Troubleshooting

### Budget Not Computing

1. Check time series file exists
2. Verify jq is available
3. Check script is executable
4. Run with `--verbose` for details

### Tight Mode Won't Clear

1. Verify you're updating via PR (not direct edit)
2. Check `set_by` is "human" in the JSON
3. Ensure reason is documented
4. Get PR approved before merge

### Issues Not Creating

1. Check workflow has `issues: write` permission
2. Verify state file is not locked
3. Check cooldown period (6 hours between updates)
4. Review workflow run logs

---

## Phase 1 vs Phase 2

### Phase 1 (Current): Advisory

- Budget is computed and published
- Issues are created when budget is low
- Tight mode flag is set
- **No enforcement of gating behavior**

### Phase 2 (Future): Enforcement

- Tight mode actively blocks non-hotfix releases
- WARN publishes require approval
- Freeze mode can be activated
- Override workflow provides temporary exceptions

---

## References

- **Budget Script**: `scripts/release/compute_error_budget.sh`
- **Renderer Script**: `scripts/release/render_error_budget_panel.sh`
- **Policy File**: `docs/ci/ERROR_BUDGET_POLICY.yml`
- **Alert Workflow**: `.github/workflows/error-budget-alerts.yml`
- **Tight Mode File**: `docs/releases/_state/governance_tight_mode.json`
- **Alert State**: `docs/releases/_state/error_budget_alerts_state.json`
- **SLO Report**: `docs/ci/RELEASE_OPS_SLO.md`

---

## Change History

| Version | Date       | Changes                             |
| ------- | ---------- | ----------------------------------- |
| 1.0.0   | 2026-01-08 | Initial error budget implementation |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
