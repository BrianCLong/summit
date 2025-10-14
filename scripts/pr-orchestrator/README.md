# PR Merge-Green Orchestrator

This orchestrator automates the process of triaging, reviewing, and merging pull requests that are "green" (passing all required checks) in the IntelGraph repository.

## Overview

The PR Merge-Green Orchestrator is a comprehensive tool that:
- Fetches open PRs and prioritizes them based on defined criteria
- Reproduces CI failures locally
- Applies safe automatic fixes when possible
- Posts structured reviews to PRs
- Merges PRs that meet all requirements
- Maintains detailed run summaries

## Configuration

The orchestrator can be configured via environment variables or the config file:

### Environment Variables
```bash
# Repository settings
REPO=BrianCLong/intelgraph-platform
BASE_BRANCH=main

# Required checks that must pass for merge
REQUIRED_CHECKS="CI - Comprehensive Gates / setup,CI - Comprehensive Gates / lint-and-typecheck,CI - Comprehensive Gates / unit-integration-tests,CI - Comprehensive Gates / security-gates,CI - Comprehensive Gates / build-and-attestation,CI - Comprehensive Gates / merge-readiness"

# Labels to prioritize or exclude
INCLUDE_LABELS="bug,security,hotfix,priority"
EXCLUDE_LABELS="wip,draft,do-not-merge"

# Processing settings
MAX_PR_COUNT=50
DRY_RUN=true      # Set to false to actually make changes
AUTO_FIX=true     # Whether to apply safe fixes
CONCURRENCY=3     # Number of PRs to process in parallel
TIMEBOX_MIN=20    # Minutes per PR before moving on
```

### Default Configuration
The configuration is stored in `scripts/pr-orchestrator-config.js` and includes:
- Repository-specific check requirements
- Priority weights for PR scoring
- Safe auto-fix rules
- Sensitive paths requiring special attention

## Usage

### Run with default settings (dry-run mode):
```bash
npm run pr:orchestrate
```

### Run with custom settings:
```bash
DRY_RUN=false AUTO_FIX=true npm run pr:orchestrate
```

### Run with specific environment settings:
```bash
REPO=your-org/your-repo MAX_PR_COUNT=10 npm run pr:orchestrate
```

## Features

### PR Prioritization
PRs are scored using the following criteria:
- Blocker/critical labels: +5
- CI or security impact: +4
- Base branch behind by >50 commits: +3
- Has failing required checks: +3
- Small diff (<500 LOC): +2
- Recent activity (<7 days): +2
- Documentation/tests improvement: +1
- Draft status: -3
- Needs author input: -2
- WIP label: -2

### Safe Auto-Fixes
The orchestrator can apply safe fixes for:
- Formatting issues (via Prettier)
- Lint errors (with --fix)
- Import path corrections
- Obvious type errors
- Test flake retries
- Missing dependencies

### Safety Rails
- Read-only mode unless safe fixes are applied
- Never force-push or rewrite contributor history
- Only push to bot branches or with proper permissions
- Never disable tests or critical checks
- Creates helper PRs for complex changes
- Defers risky changes with actionable review notes

### Run Summary
After each run, a summary is generated showing:
- Processed PRs with status
- Primary issues identified
- Actions taken
- Common failure patterns
- Repository-wide recommendations

## Requirements

- Node.js 18 or higher
- GitHub CLI (`gh`) installed and authenticated
- pnpm (the repository's package manager)
- Appropriate repository permissions

## State Management

The orchestrator maintains state in `.orchestrator/state.json` to:
- Track processed PRs
- Resume from previous runs
- Avoid reprocessing already-green PRs
- Maintain run history

## Repository-Specific Details

This orchestrator is configured specifically for the IntelGraph repository which includes:
- Monorepo with multiple services and applications
- Strict CI gates including linting, type checking, testing, and security scanning
- Branch protection rules with multiple required checks
- Sensitive paths requiring special review

The configuration ensures compatibility with the repository's existing workflows and requirements.