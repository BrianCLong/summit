# Remaining Work — Oct 2025 Delivery

**Date:** 2025-10-03
**Status:** 82/104 complete (78.8%)

## Quick Commands to Complete Remaining 22 Issues

### Option 1: Automated (Recommended)

Resume seeding from row 84:

```bash
# Create remaining issues from CSV rows 84-105
tail -n +84 project_management/october2025_sprint_tracker.csv | \
  ./.github/scripts/seed-project-resume.sh /dev/stdin 8 BrianCLong
```

### Option 2: Manual Creation

```bash
# Create issues one at a time from remaining CSV rows
tail -n +84 project_management/october2025_sprint_tracker.csv | \
while IFS=, read -r tracker_id workstream start_date end_date source_path description; do
  title="[${workstream}] ${description}"
  body="**Tracker ID:** \`${tracker_id}\`
**Workstream:** ${workstream}
**Start Date:** ${start_date:-TBD}
**End Date:** ${end_date:-TBD}
**Source:** \`${source_path}\`

Part of Oct-Nov 2025 delivery tracking."

  echo "Creating: $title"
  issue_url=$(gh issue create --title "$title" --body "$body" 2>&1 | grep -oE "https://[^ ]+")

  if [ -n "$issue_url" ]; then
    echo "  ✅ Created: $issue_url"
    gh project item-add 8 --owner BrianCLong --url "$issue_url"
    sleep 1
  fi
done
```

### Option 3: Verify Current Status

```bash
# Check current counts
echo "CSV expected: $(($(wc -l < project_management/october2025_sprint_tracker.csv) - 1))"
echo "Project items: $(gh project item-list 8 --owner BrianCLong --limit 200 --format json | jq '.items | length')"
echo "Gap: $(($(wc -l < project_management/october2025_sprint_tracker.csv) - 1 - $(gh project item-list 8 --owner BrianCLong --limit 200 --format json | jq '.items | length')))"
```

## Remaining CSV Entries (Rows 84-105)

The following 22 tracker entries need to be created as issues:

1. `083_gc-legal_sprint-20251020-to-20251031`
2. `084_intelgraph-platform_sprint-20251020`
3. `085_intelgraph-core_sprint-20251020`
4. `086_intelgraph-core_sprint-20251020`
5. `087_product-ops_sprint-20251020-to-20251031`
6. ... (17 more entries from CSV)

Run `tail -n +84 project_management/october2025_sprint_tracker.csv` to see full list.

## PR #9800 Merge Conflict Resolution

```bash
# Checkout PR branch
git checkout feat/enable-error-budget-and-metrics-export

# Rebase onto main
git fetch origin main
git rebase origin/main

# Resolve conflicts in:
# - .github/workflows/error-budget-monitoring.yml
# - .github/workflows/metrics-export.yml

# After resolving
git add .
git rebase --continue
git push --force-with-lease

# Merge via GitHub UI or CLI
gh pr merge 9800 --squash
```

## Calendar Import

```bash
# Open calendar file (will launch default calendar app)
open calendar/Topicality_Dependency_Sync_Wednesdays.ics

# Or copy to share with team
cat calendar/Topicality_Dependency_Sync_Wednesdays.ics | pbcopy
```

## Verification After Completion

```bash
# Run full audit
./scripts/project-audit.sh

# Expected output:
# ✅ Audit passed - project integrity verified
# Expected items: 104
# Actual in project: 104
```

---

**Project URL:** https://github.com/users/BrianCLong/projects/8
**PR URL:** https://github.com/BrianCLong/summit/pull/9800
**Branch:** `fix/bulk-import-lockfile-sync`
