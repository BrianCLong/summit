# Batch Merge Automation Scripts

Safe and automated batch processing of pull requests for the IntelGraph platform.

## Overview

These scripts provide comprehensive PR batch management with safety guardrails:

1. **batch-automerge.sh** - Plans and queues clean PRs for auto-merge; halts on CI failures
2. **integration-train.sh** - Creates integration branches for conflicted PRs
3. **open-orphan-prs.sh** - Surfaces ahead-of-main branches as PRs

## Quick Start

```bash
# Make scripts executable
chmod +x scripts/*.sh

# 1) Plan & queue clean PRs (halts if any CI failures detected)
./scripts/batch-automerge.sh

# 2) Build integration train for conflicted PRs and open draft PR
./scripts/integration-train.sh

# 3) Surface ahead-of-main orphan branches as PRs
./scripts/open-orphan-prs.sh
```

## Safety Features

### 🛡️ CI Failure Protection
- Detects failing CI checks across all PRs
- **Halts immediately** with non-zero exit code if any failures found
- Writes detailed reports before stopping

### 🏷️ Smart Filtering  
Automatically skips PRs with:
- Draft status
- Excluded labels: `do-not-merge`, `blocked`, `WIP`, `hold`, `logical`, `workflow`, `contextual`
- `CHANGES_REQUESTED` review status

### 📊 Comprehensive Reporting
- Markdown reports for human review
- CSV data for programmatic analysis
- Detailed action logs with rationale

### 🔒 Non-Destructive Operations
- Uses GitHub's auto-merge feature (respects branch protections)
- Never force-pushes to main
- Creates draft PRs for integration trains

## Configuration

### Environment Variables

```bash
# Repository (default: BrianCLong/intelgraph)
REPO="owner/repo"

# Default branch (default: main)
DEFAULT_BRANCH="main"

# Exclude labels (comma-separated)
EXCLUDE_LABELS="do-not-merge,blocked,WIP,hold"

# Auto-merge strategy (squash|merge|rebase)
AUTO_MERGE_STRATEGY="squash"

# Dry run mode (1 = preview only, 0 = execute)
DRY_RUN=1
```

### Report Directory
```bash
# Reports location (default: reports/)
REPORT_DIR="custom/path"
```

## Usage Examples

### Dry Run (Recommended First)
```bash
# Preview actions without making changes
DRY_RUN=1 ./scripts/batch-automerge.sh
DRY_RUN=1 ./scripts/integration-train.sh
```

### Custom Configuration
```bash
# Use rebase strategy with custom exclusions
AUTO_MERGE_STRATEGY=rebase EXCLUDE_LABELS="wip,blocked" ./scripts/batch-automerge.sh
```

### Different Repository
```bash
# Target different repo
REPO="myorg/myrepo" DEFAULT_BRANCH="develop" ./scripts/batch-automerge.sh
```

## Script Details

### 1. batch-automerge.sh

**Purpose**: Queue clean PRs for auto-merge via GitHub's merge queue

**Logic**:
1. Fetch all open PRs targeting default branch
2. Check CI status for ALL PRs
3. **HALT if any CI failures detected**
4. Classify PRs:
   - `CLEAN/HAS_HOOKS/UNSTABLE` → Auto-merge queue
   - Others → Integration train candidates
5. Queue clean PRs using `gh pr merge --auto`

**Output**:
- `reports/merge-plan-YYYYMMDD.md` - Human-readable plan
- `reports/merge-plan-YYYYMMDD.csv` - Machine-readable data
- Summary: `queued=N, conflicted=M, skipped=K, ci_fail=0/1`

### 2. integration-train.sh

**Purpose**: Create integration branch for conflicted PRs

**Logic**:
1. Read train candidates from previous step's CSV
2. Create `integration/batch-YYYYMMDD` branch from main
3. Attempt to merge each PR branch
4. Handle conflicts by:
   - Aborting merge
   - Commenting on PR to rebase
   - Logging conflict in report
5. Open draft PR for successful integration branch

**Output**:
- `reports/integration-train-YYYYMMDD.md` - Integration report
- Draft PR: "Integration Batch YYYYMMDD"
- Summary: `merged=X, conflicts=Y`

### 3. open-orphan-prs.sh

**Purpose**: Surface orphaned branches as PRs for triage

**Logic**:
1. Find remote branches ahead of main
2. Check if PR already exists
3. Create auto-labeled PR: "[Auto] branch → main"
4. Add `needs-triage` label

## GitHub Actions Integration

### Nightly Automation
`.github/workflows/batch-merge.yml` runs daily at 03:17 UTC:
- Executes batch planning and integration train
- Uploads reports as artifacts
- Non-destructive (leaves actual merging to auto-merge gates)

### Release on Main
`.github/workflows/release-on-main.yml`:
- Triggers on any push to main
- Creates date-stamped release: `v2025.08.20.1425`
- Generates release notes automatically

## Safety Guarantees

### ✅ What These Scripts Do
- Respect branch protection rules
- Use GitHub's native auto-merge (waits for checks)
- Create detailed audit trails
- Stop immediately on CI failures
- Skip problematic PRs safely

### ❌ What These Scripts Never Do
- Force-push to main or protected branches
- Bypass required reviews or status checks
- Merge PRs with failing CI
- Delete important branches without confirmation
- Operate without comprehensive logging

## Troubleshooting

### CI Failures Block Everything
**Symptom**: Script exits with "CI failures detected"
**Solution**: Fix failing checks before running batch merge

### No PRs Found
**Symptom**: "queued=0, conflicted=0, skipped=0"
**Solution**: Check if PRs exist and aren't excluded by filters

### Integration Train Conflicts
**Symptom**: High conflict count in integration report
**Solution**: PRs need rebase on latest main (authors notified)

### Permission Errors
**Symptom**: `gh` commands fail with 403
**Solution**: Ensure `GITHUB_TOKEN` has `contents: write` and `pull-requests: write`

## Dependencies

- `gh` (GitHub CLI) - PR management
- `git` - Repository operations  
- `jq` - JSON parsing
- `awk` - CSV processing
- Standard POSIX shell utilities

## Reports Format

### CSV Schema
```csv
number,title,state,reviewDecision,mergeStateStatus,action,notes
724,"PR Title",open,REVIEW_REQUIRED,BLOCKED,halt,ci-failure-detected
```

### Actions
- `auto-merge` - Queued for GitHub auto-merge
- `train` - Added to integration train
- `skip` - Excluded by filters  
- `halt` - CI failure detected

## Best Practices

1. **Always dry-run first**: `DRY_RUN=1` to preview actions
2. **Review reports**: Check generated markdown/CSV before proceeding
3. **Fix CI first**: Address any failures before batch processing
4. **Monitor auto-merge**: Let GitHub's protections handle the actual merging
5. **Handle integration conflicts**: Work with PR authors to resolve train conflicts

## Security Considerations

- Scripts never bypass security controls
- All operations respect repository permissions
- Comprehensive audit logging for compliance
- Non-destructive by design (can be reversed)
- Transparent operation with detailed reporting

This automation system provides safe, efficient batch processing while maintaining all safety guardrails and audit requirements.