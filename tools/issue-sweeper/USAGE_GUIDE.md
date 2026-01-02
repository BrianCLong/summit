# Issue Sweeper - Comprehensive Usage Guide

## Quick Start

### 1. Scan Mode (No Fixes, Just Analysis)

```bash
export GITHUB_TOKEN="ghp_your_token"
npx tsx tools/issue-sweeper/run.ts --batch-size=10 --max-batches=1
```

This will:
- Fetch 10 issues
- Classify each issue
- Search for existing fixes
- Comment on already-solved issues
- **NOT** attempt any fixes
- Generate a report

### 2. Auto-Fix Mode (Fix + Commit, No PR)

```bash
npx tsx tools/issue-sweeper/run.ts --auto-fix --batch-size=10 --max-batches=1
```

This will:
- Everything from Scan Mode
- **Attempt automated fixes** for bugs, lints, docs, CI
- **Commit fixes** to feature branches
- Verify fixes pass typecheck + lint
- **NOT** create PRs automatically

### 3. Full Automation Mode (Fix + PR + Link)

```bash
npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr --batch-size=10 --max-batches=1
```

This will:
- Everything from Auto-Fix Mode
- **Create PRs** for successful fixes
- **Link PRs to issues** with comments
- Push branches to remote
- Label PRs as `automated-fix`, `issue-sweeper`

### 4. Production Scale Mode (Continuous Processing)

```bash
npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr
```

This will:
- Process **all** issues (no batch limit)
- Create fixes and PRs for every actionable issue
- Run indefinitely until all issues processed
- Respect rate limits with automatic backoff

## CLI Options Reference

| Option | Description | Default |
|--------|-------------|---------|
| `--batch-size=N` | Number of issues per batch | 50 |
| `--max-batches=N` | Stop after N batches (0 = unlimited) | 0 |
| `--dry-run` | Don't make any changes, just log | false |
| `--auto-fix` | Attempt automated fixes | false |
| `--auto-pr` | Create PRs for fixes (requires --auto-fix) | false |
| `--skip-verification` | Skip typecheck/lint after fix | false |

## Common Workflows

### Workflow 1: Initial Audit

**Goal:** Understand the issue backlog without making changes.

```bash
# Process 100 issues in dry-run mode
npx tsx tools/issue-sweeper/run.ts --dry-run --batch-size=50 --max-batches=2

# Check the report
cat tools/issue-sweeper/REPORT.md
```

**Output:** Classification breakdown, themes, already-solved count.

---

### Workflow 2: Fix Low-Hanging Fruit

**Goal:** Auto-fix simple issues (lints, TypeScript errors, docs).

```bash
# Fix first 20 issues with auto-fix enabled
npx tsx tools/issue-sweeper/run.ts --auto-fix --batch-size=20 --max-batches=1

# Review created branches
git branch | grep issue/

# Review ledger for what was fixed
tail -20 tools/issue-sweeper/LEDGER.ndjson | jq
```

**Output:** Feature branches with fixes, ledger entries with evidence.

---

### Workflow 3: Full Automation Pipeline

**Goal:** Process all issues, create PRs, and close solved ones.

```bash
# Run full automation (WARNING: creates many PRs)
npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr --batch-size=25

# Monitor progress
watch -n 10 cat tools/issue-sweeper/REPORT.md

# Check created PRs
cat tools/issue-sweeper/STATE.json | jq '.open_prs'
```

**Output:** PRs for every fixed issue, comments linking PRs to issues, closed issues with evidence.

---

### Workflow 4: Resume After Interruption

**Goal:** Continue from where the sweeper left off.

```bash
# Just run the same command again - it auto-resumes
npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr
```

The sweeper reads `STATE.json` to know where it stopped and continues from there.

---

## Understanding the Output

### STATE.json

```json
{
  "cursor": 3,              // Currently on page 3
  "last_issue_number": 142, // Last processed issue
  "batch_size": 50,
  "total_processed": 142,
  "stats": {
    "already_solved": 98,   // Found evidence of fix
    "solved_in_this_run": 12, // Fixed by sweeper
    "not_solved": 20,       // Couldn't auto-fix
    "blocked": 8,           // Need manual input
    "duplicate": 3,
    "invalid": 1
  },
  "open_prs": [             // PRs created by sweeper
    "https://github.com/BrianCLong/summit/pull/1001",
    "https://github.com/BrianCLong/summit/pull/1002"
  ],
  "failures": []            // Errors encountered
}
```

### LEDGER.ndjson

Each line is a JSON object:

```json
{
  "issue_number": 42,
  "title": "Fix TypeScript error in auth module",
  "state": "open",
  "classification": "bug",
  "solved_status": "solved_in_this_run",
  "evidence": {
    "commits": [],
    "prs": ["https://github.com/BrianCLong/summit/pull/1001"],
    "files": ["Fixed TypeScript errors in server/auth/index.ts"],
    "verification_command": "pnpm typecheck && pnpm lint"
  },
  "actions_taken": ["committed_fix", "created_pr", "linked_pr_to_issue"],
  "processed_at": "2026-01-02T16:00:00.000Z"
}
```

Use `jq` to query:

```bash
# Count by classification
cat tools/issue-sweeper/LEDGER.ndjson | jq -s 'group_by(.classification) | map({classification: .[0].classification, count: length})'

# Find all fixed issues
cat tools/issue-sweeper/LEDGER.ndjson | jq 'select(.solved_status == "solved_in_this_run")'

# List all created PRs
cat tools/issue-sweeper/LEDGER.ndjson | jq -r '.evidence.prs[]' 2>/dev/null
```

### REPORT.md

Human-readable summary, updated after each batch.

---

## Safety and Best Practices

### 1. Start Small

**Always test with a small batch first:**

```bash
npx tsx tools/issue-sweeper/run.ts --auto-fix --batch-size=5 --max-batches=1
```

Review the results before scaling up.

---

### 2. Use Dry-Run

**Test configuration without changes:**

```bash
npx tsx tools/issue-sweeper/run.ts --dry-run --auto-fix --auto-pr
```

This simulates the full pipeline without actually committing or creating PRs.

---

### 3. Monitor Rate Limits

The sweeper handles rate limits automatically, but you can check:

```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
```

You have 5,000 requests/hour with a token.

---

### 4. Review Before Merging

Even with auto-fix, **always review PRs** before merging:

- Check the diff
- Ensure tests pass in CI
- Verify the fix addresses the root cause

---

### 5. Clean Up Failed Branches

If fixes fail verification, branches remain:

```bash
# List all issue branches
git branch | grep issue/

# Delete failed fix branches
git branch -D issue/42-some-title
```

---

## Troubleshooting

### "GITHUB_TOKEN not set"

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

Get a token at: https://github.com/settings/tokens (needs `repo` scope)

---

### "TypeScript errors remain after attempted fixes"

The auto-fixer has heuristics that may not cover all cases. These issues will be marked `not_solved` with a note in the ledger.

**Manual intervention required.**

---

### "PR creation failed"

Check:
1. Token has `repo` scope
2. Branch was pushed to remote
3. No existing PR for the same issue
4. Base branch exists (default: `main`)

---

### "Rate limit exceeded"

The sweeper will wait automatically. To speed up:

1. Use a token (5,000/hr vs 60/hr unauthenticated)
2. Reduce batch size
3. Increase delays between API calls (edit `lib/github.ts`)

---

### "Repository not clean after processing"

The sweeper should always return to the original branch. If it doesn't:

```bash
# Check current branch
git branch --show-current

# Return to main
git checkout main

# Check for uncommitted changes
git status
```

---

## Advanced Usage

### Custom Fix Patterns

Edit `lib/fixer.ts` to add custom fix logic:

```typescript
// Add a new pattern in fixBug()
if (title.includes('custom-issue-pattern')) {
  return await fixCustomPattern(issue);
}
```

### Custom Classification Rules

Edit `lib/classifier.ts`:

```typescript
if (labels.some((l) => l.includes('my-custom-label'))) {
  return 'my-custom-classification';
}
```

### Selective Processing

Process only specific issue types:

```typescript
// In run.ts, before processIssue():
const classification = classifyIssue(issue);
if (classification !== 'bug') {
  continue; // Skip non-bugs
}
```

---

## Performance Tips

### 1. Batch Size

- **Small batches (10-25):** Safer, easier to review, frequent checkpoints
- **Large batches (50-100):** Faster overall, but riskier if errors occur

### 2. Parallel Processing

The current implementation is sequential. For massive scale, consider:

- Running multiple sweeper instances on different issue ranges
- Using GitHub Actions matrix strategy

### 3. Network Optimization

Reduce API calls by:
- Caching issue metadata locally
- Using GraphQL instead of REST (future enhancement)
- Batching PR creation requests

---

## Integration with CI/CD

### GitHub Actions Workflow

```yaml
name: Issue Sweeper
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  sweep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install -g pnpm
      - run: pnpm install
      - run: npx tsx tools/issue-sweeper/run.ts --auto-fix --auto-pr --batch-size=25 --max-batches=2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/upload-artifact@v3
        with:
          name: sweeper-reports
          path: tools/issue-sweeper/*.{json,md,ndjson}
```

---

## FAQ

**Q: Will this close issues I'm actively working on?**

A: Only if evidence of a fix is found (merged PR, commit). Open PRs don't trigger closure.

---

**Q: Can I customize which issues are processed?**

A: Yes, edit `run.ts` to filter by label, milestone, assignee, etc.

---

**Q: What if I want to review fixes before creating PRs?**

A: Use `--auto-fix` without `--auto-pr`. Review the branches, then create PRs manually.

---

**Q: Does this work for issues in private repos?**

A: Yes, ensure your `GITHUB_TOKEN` has access to the private repo.

---

**Q: How do I process only issues with a specific label?**

A: Filter in the main loop:

```typescript
if (!issue.labels.some(l => l.name === 'my-label')) {
  continue;
}
```

---

## Support

For issues with the sweeper itself, file a bug in the repo with:

- Command used
- Excerpt from LEDGER.ndjson showing the failure
- STATE.json snapshot
- Error output

---

## License

MIT (same as parent repository)
