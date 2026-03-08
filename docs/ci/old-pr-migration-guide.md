# Migrating Old PRs to New CI System

**Last Updated**: 2026-03-04

**TL;DR**: Old PRs (created before 2026-03-04) need rebasing to adopt the new streamlined CI system.

---

## Why This Guide?

On 2026-03-04, we consolidated CI from **260 workflows → 8 workflows** (97% reduction). PRs created before this date reference archived workflows that no longer run.

### Symptoms Your PR Needs Migration

- ❌ PR shows 50+ failing checks
- ❌ Check names like "CI Core (Primary Gate)", "Governance Check" showing "workflow not found"
- ❌ Required check `gate` is missing or pending forever
- ❌ CI feedback says "Workflow file not found"

### What Happens If You Don't Migrate?

- **Your PR cannot merge** (missing required `gate` check)
- Old workflow checks will never complete
- PR will be stuck in "Waiting to run" state

---

## Migration Steps (Choose One)

### Option 1: Rebase (Recommended ⭐)

**Best for**: Active development, clean history

```bash
# 1. Fetch latest
git fetch origin

# 2. Switch to your branch
git checkout your-branch-name

# 3. Rebase onto main
git rebase origin/main

# 4. Force push (safe because you just rebased)
git push --force-with-lease
```

**Result**: New CI workflows trigger automatically

**Time**: 2-5 minutes

### Option 2: Merge Main

**Best for**: Complex conflicts, shared branches

```bash
# 1. Fetch latest
git fetch origin

# 2. Switch to your branch
git checkout your-branch-name

# 3. Merge main
git merge origin/main

# 4. Resolve conflicts (if any)
git add .
git commit

# 5. Push
git push
```

**Result**: New CI workflows trigger automatically

**Time**: 5-15 minutes (depending on conflicts)

### Option 3: Close and Reopen

**Best for**: No local changes, quick fix

1. Go to your PR page on GitHub
2. Click "Close pull request"
3. Wait 5 seconds
4. Click "Reopen pull request"

**Result**: New CI workflows trigger automatically

**Time**: 30 seconds

---

## Verification

After migration, your PR should show:

### ✅ New Workflows (3-4 total)

**Always runs**:
- `gate` (pr-gate workflow) - **REQUIRED CHECK**

**Runs based on changed files**:
- `lint` (docs-ci) - if docs/ or *.md changed
- `test` (server-ci) - if server/ or packages/ changed
- `test` (client-ci) - if client/ or apps/web/ changed
- (infra-ci workflows if infra/ changed)

### ❌ Old Workflows (Gone)

These should **NOT** appear anymore:
- CI Core (Primary Gate)
- Governance Check
- Summit CI
- Compliance & Governance
- GA Gate
- Evidence Check
- (252 other archived workflows)

---

## Troubleshooting

### Problem: "gate" Check Never Appears

**Cause**: PR created before consolidation, not yet migrated

**Solution**: Follow Option 1 (Rebase) above

### Problem: Old Checks Still Appearing

**Cause**: PR not fully updated, old workflow runs cached

**Solution**:
1. Wait 5 minutes for old runs to fail naturally
2. Or manually cancel old runs:
   ```bash
   # Cancel all runs for your PR
   gh run list --branch your-branch-name --status queued --json databaseId --jq '.[].databaseId' | \
     xargs -I {} gh run cancel {}
   ```
3. Push a new commit to trigger fresh runs

### Problem: Merge Conflicts During Rebase

**Cause**: Files changed significantly on main

**Solution**:
```bash
# During rebase, resolve conflicts
git status  # Shows conflicted files
# Edit files to resolve conflicts
git add .
git rebase --continue
```

Or use Option 2 (Merge Main) instead

### Problem: "gate" Check Failing

**Cause**: Real issue with your code

**Solution**: Check the workflow logs:
```bash
gh pr checks your-pr-number
# Click on the "gate" check URL to see logs
```

Common failures:
- **Lint errors**: Run `pnpm lint --fix`
- **Type errors**: Run `pnpm typecheck` and fix
- **Unit test failures**: Run `pnpm test:unit` and fix

### Problem: Force Push Rejected

**Cause**: Branch is protected or someone else pushed

**Solution**:
```bash
# Use force-with-lease (safer)
git push --force-with-lease

# If still rejected, fetch and rebase again
git fetch origin
git rebase origin/your-branch-name
git push --force-with-lease
```

---

## Understanding the New CI System

### Path Filtering

Workflows only run when relevant files change:

| Files Changed | Workflows Triggered |
|---------------|---------------------|
| `server/**` | pr-gate + server-ci |
| `client/**` | pr-gate + client-ci |
| `docs/**` or `*.md` | pr-gate + docs-ci |
| `infra/**` | pr-gate + infra-ci |
| Multiple paths | pr-gate + relevant *-ci workflows |

### Workflow Budget

- **Max workflows**: 12
- **Current active**: 7
- **Your PR triggers**: 3-4 (vs. 260 before!)

### Benefits

- ⚡ **98% faster CI** (3-4 workflows vs. 260)
- 💰 **$494k/year savings** (CI costs + developer time)
- 🌳 **923kg CO2/year reduction** (environmental impact)
- 🚀 **35 minutes saved per PR** (wait time reduction)

---

## For Maintainers: Batch Migration

If you need to migrate many PRs:

### List Old PRs

```bash
# PRs created before consolidation
gh pr list --created "<2026-03-04" --json number,title,author,createdAt

# Count
gh pr list --created "<2026-03-04" --json number | jq 'length'
```

### Comment on All Old PRs

```bash
# Post migration instructions
for pr in $(gh pr list --created "<2026-03-04" --json number --jq '.[].number'); do
  gh pr comment $pr --body "**Action Required**: Please rebase to adopt new CI system:

\`\`\`bash
git fetch origin
git checkout $(gh pr view $pr --json headRefName --jq '.headRefName')
git rebase origin/main
git push --force-with-lease
\`\`\`

See docs/ci/old-pr-migration-guide.md for details.

Old workflows have been archived (260 → 8 consolidation). Your PR will be much faster after rebasing! ⚡"
done
```

### Label Old PRs

```bash
# Add "ci-rebase-required" label
for pr in $(gh pr list --created "<2026-03-04" --json number --jq '.[].number'); do
  gh pr edit $pr --add-label "ci-rebase-required"
done
```

### Close Stale PRs

```bash
# Close PRs older than 60 days
gh pr list --created "<2025-12-01" --json number,title,createdAt

# Review list, then close with message
for pr in $(gh pr list --created "<2025-12-01" --json number --jq '.[].number'); do
  gh pr close $pr --comment "Closing due to staleness. Please reopen after rebasing if still relevant."
done
```

---

## FAQ

### Q: Why can't the system auto-migrate my PR?

**A**: GitHub Actions workflows are determined by the `.github/workflows/` files in **your PR branch**, not main. Only you can update your branch.

### Q: Will I lose my PR reviews/approvals?

**A**: No! Rebasing or merging preserves:
- ✅ Reviews and approvals
- ✅ Comments and discussions
- ✅ PR metadata (labels, assignees, etc.)

Only the commit history changes (rebase) or adds a merge commit (merge).

### Q: Can I just wait for the old checks to finish?

**A**: No. Old checks reference archived workflows that no longer exist. They will fail with "workflow not found" and never complete.

### Q: What if I already merged main but still see old checks?

**A**: Old workflow runs may still be queued. They'll fail naturally within an hour. To speed up:
- Push a new commit (triggers fresh runs)
- Or cancel old runs manually (see Troubleshooting above)

### Q: How long will the new CI take?

**A**: Typical PR:
- **pr-gate**: 3-5 minutes (lint, typecheck, unit tests)
- **path-filtered CIs**: 2-4 minutes each (only relevant ones run)
- **Total**: 5-10 minutes (vs. 45+ minutes before)

### Q: What if I need help?

**Slack**: #platform-eng or #devops-help
**Docs**: docs/ci/emergency-runbook.md
**GitHub**: Comment on your PR with `@platform-team`

---

## Timeline

| Date | Event |
|------|-------|
| 2026-03-04 | CI consolidation deployed (260 → 8 workflows) |
| 2026-03-04 | This migration guide published |
| 2026-03-05 | Batch notifications to old PR authors (planned) |
| 2026-03-11 | Review and close stale PRs (planned) |

---

## Quick Command Reference

```bash
# Check if your PR needs migration
gh pr view YOUR_PR_NUMBER --json createdAt --jq '.createdAt'
# If before 2026-03-04, needs migration

# Option 1: Rebase (recommended)
git fetch origin && \
git rebase origin/main && \
git push --force-with-lease

# Option 2: Merge main
git fetch origin && \
git merge origin/main && \
git push

# Check PR workflow status
gh pr checks YOUR_PR_NUMBER

# Cancel old workflow runs
gh run list --branch YOUR_BRANCH --status queued --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run cancel {}

# View required checks
gh api repos/BrianCLong/summit/branches/main/protection --jq '.required_status_checks.contexts'
# Should show: ["gate"]
```

---

**Questions?** Post in #platform-eng or see docs/ci/emergency-runbook.md

**Last Updated**: 2026-03-04 by Platform Team
