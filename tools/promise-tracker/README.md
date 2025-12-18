# Promise Tracker

> **Track promises from documentation to production. Every feature must complete the Definition of Done to be "totally delivered".**

## Overview

Promise Tracker is a comprehensive system for capturing, organizing, and driving commitments to completion. It solves the common problem of features being "documented but never built" or "built but never validated."

### The Problem

- Features described in docs never get implemented
- TODOs in code accumulate indefinitely
- "Shipped" features lack tests, docs, or real validation
- No visibility into the gap between promises and reality

### The Solution

Promise Tracker provides:

1. **Extraction**: Automatically scans codebase for TODOs, FIXMEs, and commitment phrases in docs
2. **Tracking**: Converts discoveries into GitHub issues with full Definition of Done checklists
3. **Monitoring**: Health dashboards showing backlog status and completion rates
4. **Enforcement**: CI guardrails ensuring docs link to tracked issues

## Quick Start

```bash
# Install dependencies
cd tools/promise-tracker
pnpm install

# Initialize in your repo
pnpm run init

# Scan codebase for promises
pnpm run extract

# View health metrics
pnpm run health

# Generate report
pnpm run report --format markdown

# Sync to GitHub (dry run first!)
pnpm run sync --dry-run
pnpm run sync --limit 10
```

## Definition of Done

Every feature tracked by this system must complete **ALL** of these criteria:

| Criterion | Description |
|-----------|-------------|
| ✅ Code Merged | PR merged to main branch |
| ✅ Tests Exist & Pass | Unit tests + integration/E2E where applicable |
| ✅ Feature Exposed | Visible in UI/API/CLI (user-facing surface) |
| ✅ Docs Updated | User-facing usage + internal runbook |
| ✅ Telemetry Wired | Metrics, logs, feature flag if applicable |
| ✅ Deployed to Staging | Live on staging environment |
| ✅ Deployed to Production | Live on production environment |
| ✅ Validated with Usage | Real or simulated usage evidence recorded |

Only when ALL boxes are checked is an item considered "totally delivered."

## Commands

### `promise-tracker extract`

Scans the codebase for:
- `TODO`, `FIXME`, `XXX`, `HACK` comments in code
- Backlog sections in markdown documentation
- Commitment phrases ("should", "must", "need to", "eventually")
- Unchecked checkboxes in markdown

```bash
pnpm run extract
pnpm run extract --code-only
pnpm run extract --docs-only
pnpm run extract -v  # verbose
```

### `promise-tracker health`

Shows backlog health metrics:

```bash
pnpm run health
pnpm run health --ci  # Exit with error if thresholds not met
```

Health metrics include:
- Total items (staging + tracked)
- Doc-only count (captured but not implemented)
- Stale in-progress (>14 days)
- Validation rate (% of prod items with evidence)
- Definition of Done completion by field

### `promise-tracker report`

Generates detailed reports:

```bash
pnpm run report                          # Table format
pnpm run report --format markdown        # Markdown
pnpm run report --format json            # JSON
pnpm run report -o report.md             # Save to file
```

### `promise-tracker sync`

Syncs staging items to GitHub issues:

```bash
# Preview what would be created
pnpm run sync --dry-run

# Create up to 10 issues
pnpm run sync --limit 10

# Only sync specific component
pnpm run sync --component Maestro
```

Requires `GITHUB_TOKEN` environment variable with `repo` scope.

### `promise-tracker init`

Initializes promise tracker in a repository:

```bash
pnpm run init
```

Creates:
- `.promise-tracker/` directory
- `config.json` with default settings
- Empty `backlog.json`
- README explaining the system

## GitHub Integration

### Issue Templates

Two issue templates are provided:

1. **Promise Feature** (`.github/ISSUE_TEMPLATE/promise-feature.yml`)
   - Full Definition of Done checklist
   - Acceptance criteria section
   - Evidence tracking
   - Source reference

2. **Promise Epic** (`.github/ISSUE_TEMPLATE/promise-epic.yml`)
   - Groups related features
   - Success measures / KPIs
   - In/out of scope definition
   - Child item tracking

### CI Workflow

The workflow (`.github/workflows/promise-tracker.yml`) provides:

1. **Doc Link Validation** (on PR)
   - Warns when docs contain TODOs without issue links
   - Adds comment reminding about promise tracking

2. **Weekly Health Check** (scheduled)
   - Runs every Monday at 9am UTC
   - Creates/updates health report issue
   - Posts metrics summary

3. **Manual Actions**
   - Extract: Scan codebase (workflow dispatch)
   - Report: Generate full report (workflow dispatch)
   - Health: Run health check (workflow dispatch)

## Grafana Dashboard

A pre-configured Grafana dashboard is available at:
`config/grafana-dashboard.json`

Import this into Grafana to visualize:
- Total items and status distribution
- Items by component (pie chart)
- Definition of Done completion (bar gauge)
- Completion velocity over time
- Average time to validation

### Prometheus Metrics

Start the metrics exporter:

```bash
pnpm run metrics
```

Exposes metrics at `http://localhost:9190/metrics`:
- `promise_tracker_total_items`
- `promise_tracker_doc_only_count`
- `promise_tracker_stale_in_progress`
- `promise_tracker_validated_rate`
- `promise_tracker_health_score`
- `promise_tracker_items_by_status{status="..."}`
- `promise_tracker_items_by_component{component="..."}`
- `promise_tracker_dod_completion{field="..."}`
- `promise_tracker_avg_days_to_validated`

## Data Schema

### Backlog Item

```typescript
interface BacklogItem {
  id: string;                    // BL-001, PT-001, etc.
  github_issue_id?: number;
  github_issue_url?: string;
  epic_id?: string;

  title: string;
  description?: string;
  component: Component;          // Summit, Maestro, etc.
  type: ItemType;                // feature, tech_debt, bug, etc.
  priority: Priority;            // P0-critical, P1-important, etc.
  status: Status;                // idea, ready, in_progress, validated, etc.
  scope_class: ScopeClass;       // tiny, small, medium, large, epic

  acceptance_criteria: AcceptanceCriterion[];
  definition_of_done: DefinitionOfDone;
  evidence: Evidence;

  owner?: string;
  dependencies: string[];
  sources: SourceReference[];

  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  validated_at?: string;
}
```

### Definition of Done

```typescript
interface DefinitionOfDone {
  code_merged: boolean;
  tests_exist_and_pass: boolean;
  feature_exposed: boolean;
  docs_updated: boolean;
  telemetry_wired: boolean;
  deployed_to_staging: boolean;
  deployed_to_prod: boolean;
  validated_with_usage: boolean;
}
```

## Best Practices

### For New Features

1. Create issue using Promise Feature template
2. Define acceptance criteria (3-7 items)
3. Link to spec/RFC if exists
4. Update Definition of Done as you progress
5. Add evidence links (PRs, test runs, demos)
6. Only close when ALL DoD items are checked

### For Documentation

1. Link TODOs to issues: `TODO: Implement X (#123)`
2. Use checkbox lists: `- [ ] Task [#123]`
3. Keep backlog sections updated
4. Run `promise-tracker extract` periodically

### For Code Comments

```typescript
// TODO(#123): Implement caching layer
// FIXME(#456): Race condition in connection pool
// HACK(#789): Workaround for upstream bug, remove when fixed
```

Always include issue reference to ensure tracking.

## Configuration

`.promise-tracker/config.json`:

```json
{
  "version": "1.0.0",
  "github": {
    "owner": "BrianCLong",
    "repo": "summit"
  },
  "extraction": {
    "excludePaths": ["**/node_modules/**", "**/dist/**"],
    "codeExtensions": ["ts", "tsx", "js", "py", "sh"],
    "docExtensions": ["md"]
  },
  "health": {
    "thresholds": {
      "minValidationRate": 50,
      "maxStaleInProgress": 5
    }
  }
}
```

## Integration with Summit/IntelGraph

Promise Tracker is designed to work with the Summit/IntelGraph platform:

- **Components**: Predefined list includes Summit, CompanyOS, Maestro, Switchboard, IntelGraph, Conductor, etc.
- **Labels**: Auto-generates labels like `component:maestro`, `promise-tracked`
- **Workflow**: Integrates with existing CI/CD and GitHub workflows

## Troubleshooting

### "No staging items found"

Run `promise-tracker extract` first to scan the codebase.

### GitHub sync fails

Ensure `GITHUB_TOKEN` is set with `repo` scope:
```bash
export GITHUB_TOKEN=ghp_your_token_here
pnpm run sync
```

### Metrics server won't start

Check port availability:
```bash
lsof -i :9190
```

Set alternative port:
```bash
PROMISE_TRACKER_METRICS_PORT=9191 pnpm run metrics
```

## License

Part of the Summit/IntelGraph platform.
