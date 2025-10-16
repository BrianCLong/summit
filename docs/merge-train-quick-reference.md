# Merge Train Quick Reference Card

**Last Updated:** 2025-10-14

---

## 🚀 Quick Commands

### Check Queue Health

```bash
# Count open PRs
gh pr list --state open --limit 500 | jq 'length'

# Count conflicting PRs
gh pr list --state open --limit 500 --json mergeable | \
  jq '[.[] | select(.mergeable == "CONFLICTING")] | length'

# Show PRs ready to merge
gh pr list --state open --limit 20 --json number,title,statusCheckRollup | \
  jq '.[] | select(.statusCheckRollup[]? | select(.name == "fast / fast" and .conclusion == "SUCCESS"))'
```

### Run Triage

```bash
# Preview what will be triaged
DRY_RUN=1 scripts/triage-conflicting-prs.sh

# Execute triage (label & comment on stale conflicting PRs)
scripts/triage-conflicting-prs.sh
```

### Analyze Hotspots

```bash
# Generate conflict hotspot report
scripts/conflict-hotspot-report.sh

# View results
cat /tmp/hotspot-report.csv
```

### Close Stale Drafts

```bash
# Find drafts older than 30 days
gh pr list --state open --draft --limit 500 --json number,createdAt,title | \
  jq '.[] | select((.createdAt | fromdateiso8601) < (now - 2592000)) | {number, title, age_days: ((now - (.createdAt | fromdateiso8601)) / 86400 | floor)}'

# Close them (review list first!)
gh pr list --state open --draft --limit 500 --json number,createdAt | \
  jq -r '.[] | select((.createdAt | fromdateiso8601) < (now - 2592000)) | .number' | \
  xargs -I {} gh pr close {} --comment "Closing stale draft PR (>30 days). Reopen if still needed."
```

---

## 📊 Key Metrics

| Metric            | Current  | Target (1mo) | Target (3mo) |
| ----------------- | -------- | ------------ | ------------ |
| Open PRs          | 343      | <150         | <100         |
| Conflict Rate     | 57%      | <30%         | <20%         |
| Avg Time-to-Merge | ~14 days | <7 days      | <3 days      |
| Merges/Week       | ~95      | 150+         | 200+         |
| Auto-Merge Rate   | ~40%     | 60%          | 80%          |

---

## 🚦 Lane Definitions

| Lane         | Criteria                         | Policy                     |
| ------------ | -------------------------------- | -------------------------- |
| **Express**  | <100 LOC, green CI, no conflicts | Auto-merge (no review)     |
| **Standard** | <500 LOC, green CI               | 1 approval required        |
| **Manual**   | >500 LOC, conflicts, CI failures | 2+ approvals, manual merge |

---

## ⚡ Troubleshooting

### "CI is stuck/not running"

```bash
# Check workflow status
gh run list --limit 10

# Re-trigger CI on a PR
gh pr view 12345 --json number
gh workflow run ci.yml --ref pr-branch-name
```

### "PR has conflicts but auto-update failed"

```bash
# Manually update PR branch
gh pr checkout 12345
git fetch origin main
git merge origin/main
# Fix conflicts, then:
git push
```

### "Merge train is slow"

1. Check GitHub Actions concurrency limits
2. Prioritize express lane PRs
3. Close stale/conflicting PRs to reduce queue depth
4. Run weekly triage sprint

---

## 📅 Daily/Weekly Routines

### Daily (10 min)

1. Check queue health: `gh pr list --state open | wc -l`
2. Review new conflicts: `scripts/triage-conflicting-prs.sh` (dry run)
3. Spot-check CI failures on recent PRs

### Weekly (1 hour)

1. **Generate hotspot report**: `scripts/conflict-hotspot-report.sh`
2. **Update CODEOWNERS** if needed
3. **Triage sprint**: Review manual lane, close stale PRs
4. **Metrics review**: Calculate conflict rate, merge velocity

---

## 🛠️ Scripts Reference

| Script                       | Purpose                                  | Runtime    |
| ---------------------------- | ---------------------------------------- | ---------- |
| `triage-conflicting-prs.sh`  | Label & comment on stale conflicting PRs | ~2-5 min   |
| `conflict-hotspot-report.sh` | Identify high-contention files           | ~30 sec    |
| `merge-train.sh`             | Core merge train automation              | Continuous |

---

## 🔗 Links

- **Full Runbook**: `docs/merge-train-runbook.md`
- **Session Summary**: `docs/merge-train-session-2025-10-14.md`
- **Auto-Resolve Workflow**: `.github/workflows/auto-resolve-conflicts.yml`
- **CODEOWNERS**: `.github/CODEOWNERS`

---

## 🆘 Escalation

If merge train is blocked or experiencing issues:

1. **Check GitHub Status**: https://www.githubstatus.com/
2. **Review failed workflow runs**: `gh run list --workflow=ci.yml --limit 5`
3. **Contact DevEx team**: @intelgraph-devops-team
4. **Emergency**: Manually merge critical PRs, resume automation later

---

**Pro Tip:** Keep this card bookmarked for quick access during daily operations!
