# Issue Sweeper - 10K+ Scale Issue Processing System

## Overview

This tool processes **all issues** in the `BrianCLong/summit` repository at scale by:

1. Determining whether each issue is already solved
2. If unsolved, implementing a perfect fix with tests and documentation
3. Opening a PR and linking it to the issue
4. Closing the issue with evidence and verification steps

## Architecture

The sweeper operates in **batches** with **checkpoints** to ensure:

- **Safety**: No mass operations without proof
- **Incrementality**: Resumable progress with state persistence
- **Auditability**: Every decision is logged with evidence
- **Scalability**: Handles 10,000+ issues via pagination

## Files

- `STATE.json` - Current progress cursor, batch size, timestamps, statistics
- `LEDGER.ndjson` - One line per issue with classification, evidence, actions
- `REPORT.md` - Human-readable summary by batch
- `run.ts` - Main batch processing script
- `lib/` - Core modules (GitHub API, classification, fixing, etc.)

## How to Run

### First Time Setup

```bash
# Ensure you have a GitHub token with repo access
export GITHUB_TOKEN="ghp_your_token_here"

# Install dependencies (if not already done)
pnpm install
```

### Run the Sweeper

```bash
# Process issues in batches (default: 50 per batch)
pnpm tsx tools/issue-sweeper/run.ts

# Process with custom batch size
pnpm tsx tools/issue-sweeper/run.ts --batch-size=25

# Process only a specific number of batches
pnpm tsx tools/issue-sweeper/run.ts --max-batches=3

# Resume from where it left off (automatic based on STATE.json)
pnpm tsx tools/issue-sweeper/run.ts
```

### Check Progress

```bash
# View current statistics
cat tools/issue-sweeper/STATE.json | jq '.stats'

# View recent ledger entries
tail -20 tools/issue-sweeper/LEDGER.ndjson | jq

# Read the report
cat tools/issue-sweeper/REPORT.md
```

## Operating Model

### Issue Classification

Each issue is classified as:

- **bug** - Code defect requiring a fix
- **feature** - New functionality request
- **docs** - Documentation improvement
- **question** - Needs clarification
- **security** - Security vulnerability
- **ci** - CI/CD related
- **perf** - Performance improvement
- **refactor** - Code quality improvement
- **unknown** - Unclear categorization

### Resolution Status

Each issue receives one of these statuses:

- **already_solved** - Fixed in a prior commit/PR (evidence provided)
- **solved_in_this_run** - Fixed by this sweeper run
- **not_solved** - Identified but not yet actionable
- **blocked** - Requires user input or clarification
- **duplicate** - Duplicate of another issue
- **invalid** - Not a valid issue (wontfix, spam, etc.)

### Evidence Requirements

Every status change requires evidence:

- Commit hashes and links
- PR numbers and links
- File paths and line numbers
- Test names and verification commands
- Reproduction steps

## Safety Guardrails

- **No placeholders** - All fixes must be complete and tested
- **No mass closing** - Each issue requires specific evidence
- **Verification required** - Every fix needs a test or reproduction command
- **CI must pass** - No PR created unless local verification succeeds
- **Rollback capability** - All changes are in PRs, easily revertible

## Batch Processing Flow

For each batch:

1. Fetch next N issues from GitHub API
2. For each issue:
   - Parse and classify
   - Search for prior resolution (PRs, commits, tests)
   - If already solved: comment with evidence
   - If unsolved and actionable: implement fix, create PR
   - Update ledger with full audit trail
3. Update STATE.json checkpoint
4. Generate batch report
5. Ensure clean repo state before next batch

## Resumability

The sweeper automatically resumes from the last processed issue by reading `STATE.json`. If interrupted:

- All completed work is saved in the ledger
- Next run picks up where it left off
- No duplicate processing

## Completion Criteria

The sweeper is complete when:

- Every issue has a ledger entry
- Every "already_solved" issue has an evidence comment
- Every "unsolved" issue has a PR or "blocked" status with clear reasoning
- Final report summarizes systemic themes

## Troubleshooting

### "API rate limit exceeded"

The sweeper respects GitHub API rate limits. If hit, it will wait and retry automatically.

### "Cannot find issue #XXX"

Check that the issue exists and your token has access to the repository.

### "CI failed for PR"

The sweeper will mark the issue as `blocked` and log the failure reason. Manual intervention required.

## Architecture Deep Dive

### Core Modules

```
tools/issue-sweeper/
├── run.ts                 # Main entry point
├── lib/
│   ├── github.ts          # GitHub API client
│   ├── classifier.ts      # Issue classification logic
│   ├── evidence.ts        # Evidence search and validation
│   ├── fixer.ts           # Fix implementation logic
│   ├── verifier.ts        # Verification and testing
│   ├── reporter.ts        # Report generation
│   └── state.ts           # State persistence
├── STATE.json             # Progress checkpoint
├── LEDGER.ndjson          # Audit trail
└── REPORT.md              # Human summary
```

### Data Flow

```
Issues (GitHub API)
  ↓
Classification (bug, feature, docs, etc.)
  ↓
Evidence Search (commits, PRs, tests)
  ↓
Decision (already_solved vs unsolved)
  ↓
Action (comment, fix+PR, or block)
  ↓
Ledger Update (audit trail)
  ↓
State Checkpoint (resumability)
```

## Contributing

When extending the sweeper:

1. Maintain determinism - same input should produce same output
2. Add logging for all decisions
3. Update ledger format if adding new fields
4. Test with small batches first
5. Document any new classification rules

## License

MIT (same as parent repository)
