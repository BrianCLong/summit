# Release Ops Orchestrator

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

The Release Ops Orchestrator is a single workflow that runs the full Release Ops automation sequence in a deterministic order and produces one comprehensive artifact bundle per cycle. It replaces scattered individual schedules with a unified "release ops tick."

### Why an Orchestrator?

| Problem                                                | Solution                                          |
| ------------------------------------------------------ | ------------------------------------------------- |
| Multiple independent schedules causing race conditions | Single sequential execution                       |
| Each script recomputes state independently             | Dashboard generated first, consumed by downstream |
| Artifact scattered across multiple workflow runs       | Single artifact bundle per cycle                  |
| Difficult to debug which step failed                   | Clear step ordering with individual reports       |
| State file commits from multiple workflows             | Single commit point with loop avoidance           |

---

## Execution Sequence

The orchestrator runs these steps in strict order:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Release Ops Orchestrator                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. GENERATE DASHBOARD                                              │
│     └── scripts/release/generate_release_train_dashboard.sh        │
│         Output: dashboard.json, dashboard.md                        │
│                                                                     │
│  2. RAISE BLOCKER ISSUES (if enabled)                              │
│     └── scripts/release/raise_blocked_release_issues.sh            │
│         Output: blocked_issues_report.md                           │
│         Reads: dashboard.json                                       │
│                                                                     │
│  3. APPLY ROUTING (if enabled)                                     │
│     └── scripts/release/auto_triage_blockers.sh                    │
│         Output: routing_report.md                                  │
│                                                                     │
│  4. APPLY ESCALATION (if enabled)                                  │
│     └── scripts/release/escalate_release_blockers.sh               │
│         Output: escalation_report.md                               │
│                                                                     │
│  5. GENERATE DIGEST (cadence-gated: daily window)                  │
│     ├── scripts/release/should_run_task.sh --task digest          │
│     └── scripts/release/generate_release_ops_digest.sh             │
│         Output: release_ops_digest.md                              │
│         Policy: RELEASE_OPS_DIGEST_POLICY.yml                      │
│                                                                     │
│  6. GENERATE HANDOFF (cadence-gated: shift-change windows)         │
│     ├── scripts/release/should_run_task.sh --task handoff         │
│     └── scripts/release/generate_oncall_handoff.sh                 │
│         Output: oncall_handoff.md                                  │
│         Policy: ONCALL_HANDOFF_POLICY.yml                          │
│                                                                     │
│  7. GENERATE SINGLE PAGE                                           │
│     └── scripts/release/generate_release_ops_single_page.sh       │
│         Output: release_ops_single_page.md (human-first summary)   │
│                                                                     │
│  7b. RENDER HTML (optional)                                        │
│      └── scripts/release/render_release_ops_single_page_html.sh   │
│          Output: release_ops_single_page.html (browser-friendly)   │
│                                                                     │
│  7c. GENERATE BUNDLE INDEX                                         │
│      └── scripts/release/generate_release_ops_bundle_index_html.sh│
│          Output: index.html (landing page with navigation)         │
│                                                                     │
│  8. UPLOAD ARTIFACT BUNDLE                                         │
│     └── release-ops-cycle-{run_id}                                 │
│                                                                     │
│  9. COMMIT STATE (if enabled, not dry-run)                         │
│     └── docs/releases/_state/*.json                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step Dependencies

| Step           | Depends On              | Produces                       |
| -------------- | ----------------------- | ------------------------------ |
| Dashboard      | -                       | `dashboard.json`               |
| Blocker Issues | `dashboard.json`        | `blocked_issues_report.md`     |
| Routing        | - (reads GitHub issues) | `routing_report.md`            |
| Escalation     | State files             | `escalation_report.md`         |
| Digest         | State files             | `release_ops_digest.md`        |
| Handoff        | State files             | `oncall_handoff.md`            |
| Single Page    | All above reports       | `release_ops_single_page.md`   |
| HTML Render    | Single Page             | `release_ops_single_page.html` |
| Bundle Index   | All artifacts           | `index.html`                   |

---

## Configuration

### Workflow Inputs

| Input                 | Type    | Default | Description                                 |
| --------------------- | ------- | ------- | ------------------------------------------- |
| `dry_run`             | boolean | `false` | No state changes, no issue writes           |
| `threshold_minutes`   | number  | `90`    | Age threshold before raising blocker issues |
| `enable_issue_writes` | boolean | `true`  | Enable issue creation/updates               |
| `enable_routing`      | boolean | `true`  | Enable routing label application            |
| `enable_escalation`   | boolean | `true`  | Enable escalation threshold checks          |
| `enable_notify`       | boolean | `false` | Enable notifications (future)               |
| `force_digest`        | boolean | `false` | Force digest (ignore cadence window)        |
| `force_handoff`       | boolean | `false` | Force handoff (ignore cadence window)       |
| `verbose`             | boolean | `false` | Enable verbose logging                      |

### Schedule

The orchestrator runs on a **60-minute schedule** by default:

```yaml
schedule:
  - cron: "0 * * * *" # Every hour on the hour
```

This replaces the individual schedules of:

- `release-blocker-escalation.yml` (was hourly)
- `release-ops-digest.yml` (was daily)
- `oncall-handoff.yml` (was 3x/day)
- `release-train-dashboard.yml` (was hourly)

---

## Running Manually

### Via GitHub Actions UI

1. Navigate to Actions → Release Ops Orchestrator
2. Click "Run workflow"
3. Configure inputs:
   - Enable `dry_run` for testing
   - Adjust `threshold_minutes` as needed
   - Disable `enable_issue_writes` to test without side effects
4. Click "Run workflow"
5. Download artifact bundle when complete

### Via CLI

```bash
# Default run (production mode)
gh workflow run release-ops-orchestrator.yml

# Dry run with verbose logging
gh workflow run release-ops-orchestrator.yml \
  -f dry_run=true \
  -f verbose=true

# Custom threshold
gh workflow run release-ops-orchestrator.yml \
  -f threshold_minutes=120

# Read-only mode (no issue writes)
gh workflow run release-ops-orchestrator.yml \
  -f enable_issue_writes=false

# Force digest generation (ignore cadence window)
gh workflow run release-ops-orchestrator.yml \
  -f force_digest=true

# Force handoff generation (ignore cadence window)
gh workflow run release-ops-orchestrator.yml \
  -f force_handoff=true
```

---

## Artifact Bundle

Each orchestrator cycle produces a single artifact bundle:

```
release-ops-cycle-{run_id}/
├── index.html                      # 👈 OPEN THIS FIRST - landing page with all links
├── release_ops_single_page.html    # Consolidated summary (browser-friendly)
├── release_ops_single_page.md      # Consolidated summary (source)
├── cycle_info.txt                  # Cycle metadata
├── cycle_summary.md                # Human-readable summary
├── dashboard.json                  # Policy-driven dashboard (machine-readable)
├── dashboard.md                    # Dashboard markdown (if generated)
├── blocked_issues_report.md        # Blocker issue actions taken
├── routing_report.md               # Routing label actions taken
├── escalation_report.md            # Escalation actions taken
├── release_ops_digest.md           # Daily digest (cadence-gated)
├── oncall_handoff.md               # On-call handoff (cadence-gated)
└── state-snapshot/                 # Point-in-time state files
    ├── blockers_state.json
    ├── digest_state.json
    └── handoff_state.json
```

### Artifact Retention

- **Retention:** 30 days
- **Size:** Typically < 1 MB per cycle

### Downloading Artifacts

```bash
# List recent runs
gh run list --workflow=release-ops-orchestrator.yml --limit 5

# Download latest artifact
gh run download <run_id> -n release-ops-cycle-<run_id>
```

---

## Loop Avoidance

The orchestrator implements multiple safeguards against infinite loops:

### 1. Commit Message Guard

If the last commit message starts with `chore(release-ops):`, the workflow exits early:

```yaml
if [[ "${LAST_COMMIT_MSG}" == "chore(release-ops):"* ]]; then
echo "should_run=false" >> $GITHUB_OUTPUT
fi
```

### 2. State-Only Change Detection

If triggered by a push that only changed state files, the workflow exits early:

```yaml
if [[ "${file}" == docs/releases/_state/* ]]; then
  # Don't count as a triggering change
fi
```

### 3. Concurrency Control

Only one orchestrator can run at a time:

```yaml
concurrency:
  group: release-ops-orchestrator
  cancel-in-progress: false # Let running cycles complete
```

---

## Cadence-Aware Execution

The orchestrator supports **multiple cadences within a single hourly schedule**. This is the "one scheduler, multiple cadences" pattern.

### How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                    Hourly Orchestrator Tick                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Steps 1-4: Run every hour (dashboard, issues, routing, etc.)   │
│                                                                  │
│  Step 5: Check Digest Cadence                                   │
│          ├── Is current time within run_window_utc?             │
│          │   (default: 08:00-09:00 UTC)                         │
│          ├── Has cadence_hours elapsed since last run?          │
│          │   (default: 24 hours)                                │
│          └── If yes to both → run digest                        │
│                                                                  │
│  Step 6: Check Handoff Cadence                                  │
│          ├── Is current time within any run_windows_utc?        │
│          │   (default: 09:00-09:30, 17:00-17:30 UTC)            │
│          ├── Has cadence_hours elapsed since last run?          │
│          │   (default: 8 hours)                                 │
│          └── If yes to both → run handoff                       │
│                                                                  │
│  Steps 7-8: Run every hour (artifacts, state commit)            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Cadence Gating Script

The `scripts/release/should_run_task.sh` helper determines if a task should run:

```bash
# Check if digest should run
./scripts/release/should_run_task.sh --task digest --verbose

# Check if handoff should run
./scripts/release/should_run_task.sh --task handoff --state docs/releases/_state/handoff_state.json
```

Exit codes:

- `0` = Task should run
- `1` = Task should be skipped (outside window or cadence not elapsed)
- `2` = Invalid arguments or configuration error

### Policy Configuration

#### Digest Policy (`docs/ci/RELEASE_OPS_DIGEST_POLICY.yml`)

```yaml
run_window_utc:
  start: "08:00" # Start of daily window
  end: "09:00" # End of daily window

cadence_hours: 24 # Minimum hours between runs
```

#### Handoff Policy (`docs/ci/ONCALL_HANDOFF_POLICY.yml`)

```yaml
run_windows_utc:
  - start: "09:00" # Morning shift change
    end: "09:30"
  - start: "17:00" # Evening shift change
    end: "17:30"

cadence_hours: 8 # Minimum hours between runs
```

### Force Overrides

For manual runs, cadence checks can be bypassed:

```bash
# Force digest via workflow dispatch
gh workflow run release-ops-orchestrator.yml -f force_digest=true

# Force handoff via workflow dispatch
gh workflow run release-ops-orchestrator.yml -f force_handoff=true

# Or via environment variable (script-level)
FORCE_RUN_DIGEST=true ./scripts/release/should_run_task.sh --task digest
```

### Anti-Spam Controls

| Mechanism               | Purpose                              |
| ----------------------- | ------------------------------------ |
| Time windows            | Restrict execution to specific hours |
| Cadence intervals       | Minimum time between executions      |
| State file timestamps   | Track last execution time            |
| Content hash comparison | Only update if content changed       |
| Force override inputs   | Emergency bypass for manual runs     |

---

## Debugging

### Where to Look for Errors

1. **Workflow Summary**: Quick overview of cycle results
2. **Step Logs**: Expand each step group for detailed logs
3. **Artifact Reports**: Download bundle for full report files
4. **State Snapshot**: Compare before/after state in artifact

### Common Issues

#### Dashboard Generation Failed

```
::warning::Dashboard generation failed, creating minimal dashboard
```

**Cause:** `generate_release_train_dashboard.sh` encountered an error

**Resolution:**

1. Check script logs in Step 1 group
2. Verify GitHub API access (`GH_TOKEN`)
3. Run locally: `./scripts/release/generate_release_train_dashboard.sh --verbose`

#### State Commit Failed

```
::warning::Failed to push state updates
```

**Cause:** Git push failed (permissions or conflict)

**Resolution:**

1. Check if `GITHUB_TOKEN` has write permissions
2. Check for concurrent commits
3. Manual push may be needed: `git push origin main`

#### Script Not Found

```
::warning::Dashboard generator not found, creating placeholder
```

**Cause:** Script file doesn't exist or isn't executable

**Resolution:**

1. Verify script exists: `ls -la scripts/release/`
2. Make executable: `chmod +x scripts/release/*.sh`

---

## Deprecation Plan

### Superseded Workflows

The orchestrator replaces these individual scheduled workflows:

| Workflow                         | Previous Schedule | New Status           |
| -------------------------------- | ----------------- | -------------------- |
| `release-train-dashboard.yml`    | Hourly            | Step in orchestrator |
| `release-blocker-escalation.yml` | Hourly            | Step in orchestrator |
| `release-ops-digest.yml`         | Daily             | Step in orchestrator |
| `oncall-handoff.yml`             | 3x/day            | Step in orchestrator |
| `auto-triage-blockers.yml`       | Event-driven      | Step in orchestrator |

### Migration Path

1. **Phase 1 (Current)**: Orchestrator runs alongside existing workflows
2. **Phase 2**: Remove schedules from individual workflows, keep `workflow_dispatch`
3. **Phase 3**: Individual workflows become orchestrator-only (deprecated as standalone)

### Keeping Individual Workflows

Individual workflows remain available via `workflow_dispatch` for:

- Emergency manual runs
- Debugging specific steps
- Testing changes before orchestrator integration

---

## References

- **Workflow File**: `.github/workflows/release-ops-orchestrator.yml`
- **Single Page Generator**: `scripts/release/generate_release_ops_single_page.sh`
- **HTML Renderer**: `scripts/release/render_release_ops_single_page_html.sh`
- **Bundle Index Generator**: `scripts/release/generate_release_ops_bundle_index_html.sh`
- **Single Page Docs**: `docs/ci/RELEASE_OPS_SINGLE_PAGE.md`
- **Cadence Gating Script**: `scripts/release/should_run_task.sh`
- **Dashboard Generator**: `scripts/release/generate_release_train_dashboard.sh`
- **Dashboard Docs**: `docs/ci/RELEASE_TRAIN_DASHBOARD.md`
- **Required Checks Policy**: `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- **Digest Policy**: `docs/ci/RELEASE_OPS_DIGEST_POLICY.yml`
- **Handoff Policy**: `docs/ci/ONCALL_HANDOFF_POLICY.yml`
- **Release Ops Index**: `docs/ci/RELEASE_OPS_INDEX.md`

---

## Change History

| Version | Date       | Changes                                                        |
| ------- | ---------- | -------------------------------------------------------------- |
| 1.4.0   | 2026-01-08 | Add bundle index.html landing page                             |
| 1.3.0   | 2026-01-08 | Add static HTML rendering for single page                      |
| 1.2.0   | 2026-01-08 | Add single page summary generator                              |
| 1.1.0   | 2026-01-08 | Add cadence-aware execution (one scheduler, multiple cadences) |
| 1.0.0   | 2026-01-08 | Initial orchestrator implementation                            |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
