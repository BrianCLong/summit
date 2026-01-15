# Release Ops Pages Publish Allowlist

**Status:** Active
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

This document defines exactly what content may be published to GitHub Pages by the Release Ops system. The allowlist is enforced by `scripts/release/build_release_ops_site.sh` and verified by the `publish-release-ops-pages.yml` workflow.

**Principle:** Only publish content that is safe for public visibility. When in doubt, exclude it.

---

## Allowed Files

These files MAY be published to GitHub Pages:

| File                                | Purpose                                             | Sensitivity |
| ----------------------------------- | --------------------------------------------------- | ----------- |
| `index.html`                        | Landing page with navigation                        | Public      |
| `release_ops_single_page.html`      | Consolidated release status summary                 | Public      |
| `release_ops_single_page.md`        | Source markdown for single page                     | Public      |
| `cycle_summary.md`                  | Orchestrator run configuration/metrics              | Public      |
| `dashboard_summary.json`            | **Sanitized** excerpt of dashboard                  | Public      |
| `redaction_health.json`             | Redaction health status (counts-only)               | Public      |
| `rollback_report.md`                | Rollback notification (when deployed from snapshot) | Public      |
| `rollback_report.json`              | Rollback metadata (counts-only)                     | Public      |
| `deployment_marker.json`            | Deployment status metadata                          | Public      |
| `deployment_marker.html`            | Embeddable deployment status banner                 | Public      |
| `redaction_metrics_timeseries.json` | Historical metrics time series (counts-only)        | Public      |
| `redaction_metrics_trend.html`      | Trend visualization page (HTML)                     | Public      |
| `redaction_metrics_trend.md`        | Trend visualization page (Markdown)                 | Public      |
| `release_ops_slo.json`              | SLO metrics data (counts-only)                      | Public      |
| `release_ops_slo.html`              | SLO report page (HTML)                              | Public      |
| `release_ops_slo.md`                | SLO report page (Markdown)                          | Public      |
| `error_budget.json`                 | Error budget metrics (counts-only)                  | Public      |
| `error_budget.html`                 | Error budget panel (HTML)                           | Public      |
| `error_budget.md`                   | Error budget panel (Markdown)                       | Public      |

### Notes on Allowed Content

- **`dashboard_summary.json`** is a sanitized version of `dashboard.json` containing only:
  - Summary counts (total, promotable, blocked, pending)
  - Candidate tags and states (no blocker details)
  - Generated timestamp

- **`redaction_health.json`** contains only:
  - Status level (OK/WARN/FAIL)
  - Reason codes (no raw patterns or values)
  - Numeric counts (no sensitive strings)
  - Date and run ID

- **`release_ops_single_page.html/md`** contains aggregated public information only

- **`rollback_report.md/json`** (only present during rollback) contains:
  - Failed run ID
  - Restored snapshot ID
  - Reason category (no raw pattern details)
  - Timestamp

- **`deployment_marker.json/html`** contains:
  - Deployment status (OK, WARN, ROLLED_BACK)
  - Source run ID and snapshot ID
  - Git SHA (first 7 chars)
  - Timestamp

- **`redaction_metrics_timeseries.json`** contains:
  - Historical time series of metrics (capped at 60 entries)
  - Numeric counts only (tokens, domains, issues, etc.)
  - Health level and deployment status per entry
  - Rollback reasons (category codes only)

- **`redaction_metrics_trend.html/md`** contains:
  - Table of recent runs with counts
  - Stability summary (rollbacks in last 7/30 entries)
  - ASCII sparklines for trend visualization
  - No sensitive content, all counts-only

- **`release_ops_slo.json`** contains:
  - Weekly/monthly/all-time SLO metrics
  - Success rates, rollback rates, FAIL rates
  - MTBR (mean time between rollbacks)
  - Streak statistics
  - Recent incidents by date/run_id only

- **`release_ops_slo.html/md`** contains:
  - KPI summary tables with target comparisons
  - Status indicators (MEETING/AT_RISK/FAILING)
  - Recent incident list (counts-only)
  - All counts-only, no sensitive content

- **`error_budget.json`** contains:
  - Monthly budget allocations and consumption
  - Remaining budget counts
  - Tier status (GREEN/YELLOW/RED)
  - Burn rate and projections (counts-only)

- **`error_budget.html/md`** contains:
  - Budget consumption progress bars
  - Tier status banner
  - Exhaustion alerts (when applicable)
  - All counts-only, no sensitive content

---

## Blocked Files

These files MUST NEVER be published to GitHub Pages:

| File/Pattern               | Reason                                               |
| -------------------------- | ---------------------------------------------------- |
| `*_state.json`             | Contains internal state, timestamps, issue tracking  |
| `state-snapshot/*`         | Point-in-time state snapshots                        |
| `blockers_state.json`      | Escalation state with issue references               |
| `digest_state.json`        | Digest generation tracking                           |
| `handoff_state.json`       | Shift handoff tracking                               |
| `triage_state.json`        | Triage cooldown data                                 |
| `remediation_state.json`   | Remediation attempt history                          |
| `dashboard.json`           | Full dashboard may contain sensitive blocker details |
| `blocked_issues_report.md` | May contain issue bodies/internal details            |
| `routing_report.md`        | Internal routing decisions                           |
| `escalation_report.md`     | Internal escalation details                          |
| `cycle_info.txt`           | Internal metadata                                    |

### Why These Are Blocked

1. **State files** contain operational state that could reveal:
   - Issue tracking patterns
   - Internal escalation thresholds
   - Team routing rules

2. **Full reports** may contain:
   - GitHub issue bodies (potentially sensitive)
   - Internal team names/handles
   - Blocker details that shouldn't be public

3. **Dashboard.json** contains the full candidate analysis including:
   - Specific check failure messages
   - Internal workflow run IDs
   - Detailed blocker information

---

## Enforcement

### Build Script Enforcement

`scripts/release/build_release_ops_site.sh` enforces the allowlist:

```bash
ALLOWLIST=(
    "index.html"
    "release_ops_single_page.html"
    "release_ops_single_page.md"
    "cycle_summary.md"
    "dashboard_summary.json"
)

BLOCKLIST_PATTERNS=(
    "state-snapshot/*"
    "*_state.json"
    "dashboard.json"
    "blocked_issues_report.md"
    ...
)
```

Files not on the allowlist are skipped. Files matching blocklist patterns are explicitly rejected.

### Workflow Verification

The `publish-release-ops-pages.yml` workflow verifies:

```yaml
- name: Verify Site Contents
  run: |
    # Verify no state files leaked
    if find site/release-ops -name "*_state.json" | grep -q .; then
      echo "::error::State files found!"
      exit 1
    fi
```

If blocked content is detected, the workflow fails and does not publish.

---

## Adding Files to the Allowlist

To add a new file to the allowlist:

1. **Assess sensitivity**: Ensure the file contains no sensitive information
2. **Update the script**: Add to `ALLOWLIST` array in `build_release_ops_site.sh`
3. **Update this document**: Add to the "Allowed Files" table above
4. **Get review**: Changes to the allowlist should be reviewed by Platform Engineering

---

## Emergency: Disable Publishing

To immediately disable Pages publishing:

1. **Disable workflow**: Go to Actions → "Publish Release Ops Pages" → ... → Disable workflow
2. **Or remove trigger**: Comment out the `workflow_run` trigger in the workflow file

To unpublish existing content:

1. Go to Settings → Pages
2. Change source to "None" or select a different branch/folder

---

## References

- **Build Script**: `scripts/release/build_release_ops_site.sh`
- **Publish Workflow**: `.github/workflows/publish-release-ops-pages.yml`
- **Pages Documentation**: `docs/ci/RELEASE_OPS_PAGES.md`
- **Rollback Documentation**: `docs/ci/PAGES_ROLLBACK.md`

---

**Document Authority**: Platform Engineering
**Review Schedule**: Quarterly or when allowlist changes
