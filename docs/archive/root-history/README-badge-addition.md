# README Badge Addition

Add this status badge to your README.md:

```markdown
[![Weekly Repository Hygiene](https://github.com/BrianCLong/summit/actions/workflows/weekly-hygiene.yml/badge.svg)](https://github.com/BrianCLong/summit/actions/workflows/weekly-hygiene.yml)
```

# First Test Commands

After PR #1296 merges, run these:

```bash
# Test dry-run (safe, no changes)
gh workflow run "Weekly Repository Hygiene" \
  --repo BrianCLong/summit \
  -f dry_run=true

# Check logs
gh run view --repo BrianCLong/summit --log --latest

# If dry-run looks good, do live run
gh workflow run "Weekly Repository Hygiene" \
  --repo BrianCLong/summit \
  -f dry_run=false \
  -f target_prs="1289,1288"  # Optional: target specific PRs
```

# Hardening Recommendations

1. **GitHub App/PAT**: Replace `GITHUB_TOKEN` with fine-scoped PAT
2. **Branch Protection**: Protect `repo-hygiene/weekly` branch
3. **Rate Limiting**: Add `GH_RATE_LIMIT` backoff in PR loops
4. **Notifications**: Uncomment Slack webhook in patch above
