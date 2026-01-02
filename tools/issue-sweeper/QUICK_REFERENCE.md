# Issue Sweeper - Quick Reference

## Installation & Setup

```bash
# 1. Get a GitHub personal access token
# https://github.com/settings/tokens
# Required scopes: repo (full control)

# 2. Set environment variable
export GITHUB_TOKEN="ghp_your_token_here"

# 3. Verify installation
npx tsx tools/issue-sweeper/run.ts --help
```

---

## Common Commands

### Scan First 10 Issues (No Changes)
```bash
npx tsx tools/issue-sweeper/run.ts --batch-size=10 --max-batches=1
```

### Auto-Fix First 10 Issues (Commit but No PR)
```bash
npx tsx tools/issue-sweeper/run.ts --auto-fix --batch-size=10 --max-batches=1
```

### Full Automation First 10 Issues (Fix + PR + Link)
```bash
npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr --batch-size=10 --max-batches=1
```

### Process All Issues (Production Mode)
```bash
npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr
```

### Dry Run (Simulate Everything)
```bash
npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr --dry-run
```

### Local Testing (No GitHub API)
```bash
npx tsx tools/issue-sweeper/test-local.ts
```

---

## CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--batch-size=N` | Issues per batch | 50 |
| `--max-batches=N` | Stop after N batches | 0 (unlimited) |
| `--dry-run` | Simulate, don't change anything | false |
| `--auto-fix` | Attempt automated fixes | false |
| `--auto-pr` | Create PRs (requires --auto-fix) | false |
| `--skip-verification` | Skip typecheck/lint after fix | false |

---

## Check Progress

### View Statistics
```bash
cat tools/issue-sweeper/STATE.json | jq '.stats'
```

### View Report
```bash
cat tools/issue-sweeper/REPORT.md
```

### View Recent Ledger Entries
```bash
tail -20 tools/issue-sweeper/LEDGER.ndjson | jq
```

### Count Issues by Classification
```bash
cat tools/issue-sweeper/LEDGER.ndjson | jq -s 'group_by(.classification) | map({classification: .[0].classification, count: length})'
```

### Find All Fixed Issues
```bash
cat tools/issue-sweeper/LEDGER.ndjson | jq 'select(.solved_status == "solved_in_this_run")'
```

### List All Created PRs
```bash
cat tools/issue-sweeper/LEDGER.ndjson | jq -r '.evidence.prs[]' 2>/dev/null | sort -u
```

---

## Troubleshooting

### "GITHUB_TOKEN not set"
```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### "Rate limit exceeded"
```bash
# Check rate limit status
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit | jq '.rate'

# Wait for reset or reduce batch size
npx tsx tools/issue-sweeper/run.ts --batch-size=10
```

### "TypeScript errors remain"
- Auto-fixer can't fix all patterns
- Issue will be marked `not_solved` in ledger
- Manual fix required

### Repository Not Clean
```bash
# Check status
git status

# Return to main
git checkout main

# Clean up
git reset --hard
```

### View Failed Issues
```bash
cat tools/issue-sweeper/STATE.json | jq '.failures'
```

---

## Branch Management

### List All Issue Branches
```bash
git branch | grep issue/
```

### Delete Failed Fix Branches
```bash
git branch -D issue/123-some-title
```

### Clean Up All Issue Branches
```bash
git branch | grep issue/ | xargs git branch -D
```

---

## Reset & Restart

### Reset STATE.json (Start Over)
```bash
cat > tools/issue-sweeper/STATE.json <<'EOF'
{
  "cursor": 1,
  "last_issue_number": 0,
  "batch_size": 50,
  "run_started_at": null,
  "run_updated_at": null,
  "open_prs": [],
  "failures": [],
  "total_processed": 0,
  "stats": {
    "already_solved": 0,
    "solved_in_this_run": 0,
    "not_solved": 0,
    "blocked": 0,
    "duplicate": 0,
    "invalid": 0
  }
}
EOF
```

### Clear Ledger
```bash
> tools/issue-sweeper/LEDGER.ndjson
```

### Full Reset
```bash
rm tools/issue-sweeper/STATE.json
rm tools/issue-sweeper/LEDGER.ndjson
rm tools/issue-sweeper/REPORT.md
```

---

## Advanced Usage

### Process Only Bugs
Edit `run.ts` before the `processIssue()` call:
```typescript
const classification = classifyIssue(issue);
if (classification !== 'bug') continue;
```

### Process Only Open Issues
Change `fetchIssues()` call:
```typescript
const issues = await githubClient.fetchIssues(
  state.cursor,
  state.batch_size,
  'open'  // ← Change from 'all'
);
```

### Skip Security Issues
Edit `lib/processor.ts`:
```typescript
if (classification === 'security') {
  continue; // Skip processing
}
```

---

## File Locations

```
tools/issue-sweeper/
├── STATE.json          # Progress checkpoint
├── LEDGER.ndjson       # Audit trail (one line per issue)
├── REPORT.md           # Human-readable summary
├── README.md           # Main documentation
├── USAGE_GUIDE.md      # Comprehensive guide
├── ARCHITECTURE.md     # System design
├── QUICK_REFERENCE.md  # This file
├── VERIFICATION_COMMANDS.md  # Repo verification commands
├── run.ts              # Main entry point
├── test-local.ts       # Local mock testing
├── tsconfig.json       # TypeScript config
└── lib/
    ├── types.ts        # TypeScript types
    ├── github.ts       # GitHub API client
    ├── classifier.ts   # Issue classification
    ├── evidence.ts     # Evidence search
    ├── fixer.ts        # Automated fixes
    ├── verifier.ts     # CI/CD verification
    ├── pr-automation.ts # PR creation
    ├── processor.ts    # Core pipeline
    ├── state.ts        # State persistence
    ├── reporter.ts     # Report generation
    └── mock-data.ts    # Test data
```

---

## Workflow Examples

### Example 1: Safe Initial Scan
```bash
# Scan 50 issues without making changes
npx tsx tools/issue-sweeper/run.ts --batch-size=50 --max-batches=1

# Review report
cat tools/issue-sweeper/REPORT.md

# Check classifications
cat tools/issue-sweeper/LEDGER.ndjson | jq -s 'group_by(.classification) | map({classification: .[0].classification, count: length})'
```

### Example 2: Fix Bugs Only
```bash
# Edit run.ts to filter for bugs
# Then:
npx tsx tools/issue-sweeper/run.ts --auto-fix --batch-size=25 --max-batches=1

# Review fix branches
git branch | grep issue/

# Check ledger for fixed issues
cat tools/issue-sweeper/LEDGER.ndjson | jq 'select(.solved_status == "solved_in_this_run")'
```

### Example 3: Full Production Run
```bash
# WARNING: This will process ALL issues and create many PRs
npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr

# Monitor in another terminal:
watch -n 10 'cat tools/issue-sweeper/STATE.json | jq ".stats"'

# If interrupted, resume with same command:
npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr
```

---

## Environment Variables

```bash
# Required
export GITHUB_TOKEN="ghp_..."

# Optional (for custom configuration)
export REPO_OWNER="BrianCLong"
export REPO_NAME="summit"
export BASE_BRANCH="main"
```

---

## CI/CD Integration

### GitHub Actions (Daily Sweep)
```yaml
name: Daily Issue Sweep
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily

jobs:
  sweep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g pnpm
      - run: pnpm install
      - run: npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr --max-batches=5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Support & Debugging

### Enable Verbose Logging
Add to top of `run.ts`:
```typescript
process.env.DEBUG = 'true';
```

### Capture Full Output
```bash
npx tsx tools/issue-sweeper/run.ts --auto-fix 2>&1 | tee sweep.log
```

### Check GitHub API Rate Limit
```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit | jq
```

---

## Performance Tips

- **Small batches:** Safer, easier to debug, frequent checkpoints
- **Large batches:** Faster overall, but risky if errors occur
- **Parallel runs:** Can run multiple sweepers on different issue ranges
- **Skip verification:** Use `--skip-verification` to speed up (risky)

---

## License

MIT (same as parent repository)
