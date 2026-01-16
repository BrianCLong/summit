# Summit Development Roadmap (Project 19) - Governance System

## Overview

This system provides automated governance for the Summit Development Roadmap (Project 19), ensuring that roadmaps are kept synchronized with GitHub issues/PRs and CI/CD artifacts. It operates in a "governance-first" mode where policy violations are prevented rather than just detected.

## Field Expansion (New in v2026.01.15)

This governance system now includes expanded fields for enhanced automation, governance, and executive visibility:

### Execution & Flow Fields
- **Delivery Class**: Portfolio classification (Feature, Infra, Security, etc.)
- **Work Type**: Human vs agent execution pattern (Human, Agent, Hybrid)
- **Automation Eligibility**: Safe automation boundaries (Manual Only, Agent Assist, etc.)
- **WIP Risk**: Execution risk for prioritization
- **Execution Confidence**: 0-100 automation confidence score
- **Planned/Actual Dates**: Start/finish tracking
- **Dependency Tracking**: Upstream/downstream impact counts

### Governance & Compliance Fields
- **Governance Gate**: Stage gates (Design, Security, Compliance, Release, GA)
- **Evidence Tracking**: Required/complete with bundle IDs
- **Audit Classification**: Criticality and external audit scope
- **Control Mapping**: Framework compliance (SOC2, ISO27001, etc.)

### CI/CD Integration Fields
- **CI Status Snapshot**: Real-time CI health
- **Determinism Risk**: Non-determinism detection
- **Test Coverage Delta**: Coverage changes
- **Release Controls**: Train, blocker, rollback, kill-switch status

### Agent Orchestration Fields
- **Primary/Secondary Agents**: Agent assignment tracking
- **Prompt Tracking**: ID and version for reproducibility
- **Safety Controls**: Max scope, approval requirements, dry-run support

### Strategic Alignment Fields
- **Strategic Theme**: Executive alignment (GA Readiness, Trust, Scale, etc.)
- **Customer Impact**: External reach classification
- **Risk/Value Scoring**: Impact, effort, risk, and WSJF scores

## Architecture

The system consists of several components:

### Core Libraries (`lib/`)
- `github-graphql.mjs` - GitHub GraphQL API client with rate limiting
- `determinism.mjs` - Stable sorting, hashing, and deterministic operations
- `schema.mjs` - Schema validation and normalization
- `field-ops.mjs` - Field creation and management operations
- `item-ops.mjs` - Project item operations (finding, updating, linking to content)
- `mapping.mjs` - Label/milestone/workflow to field mapping logic
- `scoring.mjs` - Computed field calculations (WSJF, True Priority, GA Readiness)
- `artifacts.mjs` - Workflow artifact download, parsing, and processing

### Binary Scripts (`bin/`)
- `ensure-fields.mjs` - Create/update fields to match schema
- `apply-event.mjs` - Process GitHub events (issues/PRs) and update fields
- `apply-workflow-run.mjs` - Process workflow run completion and artifacts
- `reconcile-nightly.mjs` - Nightly recompute derived fields and fix drift
- `generate-board-snapshot.mjs` - Create executive summary reports
- `process-event.mjs` - Enhanced event processing with expanded field support
- `process-ci-signal.mjs` - Enhanced CI artifact processing

### Configuration (`scripts/config/`)
- `project19-field-schema.json` - Canonical field definitions and expected state
- `project19-label-map.json` - How labels/milestones map to field values
- `project19-workflow-map.json` - Which workflows drive which field updates
- `project19-score-policy.json` - Deterministic formulas for derived fields
- `project19-views.json` - Project view definitions

## Environment Variables

All binaries respect these environment variables:

- `GITHUB_TOKEN` - (Required) GitHub Personal Access Token with appropriate permissions
- `PROJECT19_SCHEMA` - Path to field schema (default: `scripts/config/project19-field-schema.json`)
- `LABEL_MAP` - Path to label mapping config (default: `scripts/config/project19-label-map.json`)
- `SCORE_POLICY` - Path to scoring policy (default: `scripts/config/project19-score-policy.json`)
- `DRY_RUN` - If "true", only plan changes without applying them (default: "true")
- `MAX_FIX_SCOPE` - Maximum number of field updates allowed per run (default: 50)

## Usage

### 1. Field Provisioning
Ensure all fields defined in the schema exist in the Project:
```bash
GITHUB_TOKEN=... DRY_RUN=false MAX_FIX_SCOPE=50 PROJECT19_SCHEMA=scripts/config/project19-field-schema.json PROJECT_ID=project-19-id npm run ensure:project19-fields
```

### 2. Event Processing
Process GitHub events and update corresponding fields:
```bash
GITHUB_TOKEN=... DRY_RUN=false MAX_FIX_SCOPE=200 PROJECT_ID=project-19-id EVENT_PATH=path/to/event.json npm run process:project19-event
```

### 3. CI/CD Integration
Process workflow runs and update fields based on artifacts:
```bash
GITHUB_TOKEN=... DRY_RUN=false MAX_FIX_SCOPE=200 PROJECT_ID=project-19-id WORKFLOW_RUN_PATH=path/to/workflow-run.json npm run process:ci-signal
```

### 4. Nightly Reconciliation
Recompute derived fields and fix drift overnight:
```bash
GITHUB_TOKEN=... DRY_RUN=false MAX_FIX_SCOPE=500 PROJECT_ID=project-19-id npm run reconcile:project19-nightly
```

### 5. Executive Snapshots
Generate weekly board/executive summary:
```bash
GITHUB_TOKEN=... PROJECT_ID=project-19-id npm run generate:snapshot
```

## GitHub Workflows

The following workflows are provided in `.github/workflows/`:

- `project19-fields-ensure.yml` - Ensure fields match schema (weekly/manual)
- `project19-event-sync.yml` - Sync GitHub events to Project fields (on event)
- `project19-ci-signals.yml` - Process CI/CD artifacts and update signals (on workflow completion)
- `project19-nightly-reconcile.yml` - Nightly reconciliation and drift repair (daily)
- `project19-generate-snapshot.yml` - Generate weekly executive summaries (weekly)

## Safety Features

1. **DRY_RUN by default** - All operations are dry-run unless explicitly enabled
2. **MAX_FIX_SCOPE limits** - Prevents runaway changes
3. **Deterministic operations** - Consistent sorting and field ordering
4. **Schema validation** - Validates field definitions before applying
5. **Comprehensive reporting** - All runs produce detailed reports and summaries
6. **Computed field protection** - Prevents manual edits to calculated fields

## Executive and Audit Dashboards

The system supports these standardized Project Views (stored in `project19-views.json`):

### Executive Views
- **Release Readiness Cockpit** - GA and upcoming release progress tracking
- **Top Blockers** - Critical items blocking progress
- **Portfolio Allocation** - Work distribution across delivery classes and strategic themes
- **Automation Throughput** - Agent and automation effectiveness tracking

### Audit Views
- **Audit Scope WIP** - Audit-relevant work in progress
- **Evidence Missing** - Items requiring evidence that aren't complete
- **Determinism Exceptions** - Items with CI/CD health issues
- **Change Control** - Items requiring explicit approvals

## Integration with CI/CD

The system integrates with CI/CD by:
1. **Listening to workflow completion events** to update CI-related fields
2. **Downloading and parsing artifacts** to update evidence and compliance fields
3. **Providing required status checks** that can gate releases
4. **Computing readiness gates** that must be green before releasing

## "No Duplication" Policy

The system follows a "no duplication" mapping where:
- **Projects store only pointers and summaries** - Full evidence remains in CI artifacts
- **Projects store Yes/No, buckets, scores** - Not full evidence details
- **CI artifacts store the complete details** - Projects get summary/links only

This prevents data duplication and ensures a single source of truth for complex data.

## Post-GA Transition

The system is designed to evolve after GA:
- **GA gates** transition to **operational gates** (SLO compliance, incident rate, etc.)
- **Roadmap priority** shifts to **SLO risk and operational debt**
- **Overrides** become **time-bounded with explicit expiration**

See `docs/post-ga-transition-policy.md` for full details on the post-GA evolution.

## Troubleshooting

### Common Issues
1. **"Field not found" errors** - Run `ensure:project19-fields` to create missing fields
2. **"Permission denied" errors** - Verify `GITHUB_TOKEN` has appropriate permissions
3. **"Too many field updates" errors** - Increase `MAX_FIX_SCOPE` or investigate root cause
4. **"Schema validation failed"** - Verify schema JSON is valid and follows format

### Debugging
Set `NODE_DEBUG=github-graphql` to see detailed GitHub API communication.
Check the `artifacts/project19/` directory for detailed reports and logs.

## Maintenance

### Regular Tasks
1. **Weekly** - Review field reconciliation reports
2. **Monthly** - Audit computed field calculations and accuracy
3. **Quarterly** - Review and update field schema as needed
4. **As needed** - Update label mappings based on evolving processes

### Backup
Configuration files in `scripts/config/` should be backed up as they represent the governance policy.

## Permissions Required

The GitHub token needs:
- `contents:read` - Read repository contents
- `issues:write` - Update issue-related fields
- `pull-requests:write` - Update PR-related fields
- `organization-projects:write` - Update organization projects
- `repository-projects:write` - Update repository projects
- `actions:read` - Download workflow artifacts (for CI signal processing)
- `project:read` - Read project configuration
- `project:write` - Update project configuration