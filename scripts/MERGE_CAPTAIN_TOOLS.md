# Merge Captain Tools

Automation tools for branch hygiene and merge train management.

## Quick Start

```bash
# Run branch triage analysis
python3 scripts/merge-captain-triage.py

# Review results
ls -lh .merge-captain/

# Execute cleanup (requires gh CLI)
.merge-captain/cleanup-commands.sh
```

## Tools

### 1. `merge-captain-triage.py` (Recommended)

**Purpose**: Analyze all branches and categorize for cleanup

**Features**:
- ✅ Identifies already-merged branches (0 unique commits)
- 🚨 Detects ancient branches (7000+ commits ahead) - catastrophic merge risk
- 🧹 Finds stale auto-remediation branches (older than cutoff date)
- 📏 Lists distant branches (> 150 commits behind)
- ⚠️  Flags conflict-prone branches (> 100 commits behind)
- 🚀 Generates executable cleanup script

**Usage**:
```bash
python3 scripts/merge-captain-triage.py
```

**Output**:
- `.merge-captain/already-merged-branches.txt` - Safe to close (changes in main)
- `.merge-captain/ancient-branches.txt` - **URGENT**: Close immediately
- `.merge-captain/stale-auto-remediation.txt` - Superseded state updates
- `.merge-captain/distant-branches.txt` - Very far behind main
- `.merge-captain/conflict-prone-branches.txt` - Likely to have conflicts
- `.merge-captain/cleanup-commands.sh` - Executable cleanup script

### 2. `merge-captain-cleanup.sh` (Legacy)

**Purpose**: Bash-based branch analysis (use Python version instead)

**Note**: May have issues in some environments. Prefer `merge-captain-triage.py`.

## Workflow

### 1. Analysis Phase

```bash
# Run triage
python3 scripts/merge-captain-triage.py

# Review ancient branches (PRIORITY 1)
cat .merge-captain/ancient-branches.txt

# Review already-merged branches
cat .merge-captain/already-merged-branches.txt

# Check cleanup script
cat .merge-captain/cleanup-commands.sh
```

### 2. Cleanup Phase

**Prerequisites**:
- GitHub CLI installed: `gh version`
- Authenticated: `gh auth status`

**Execute**:
```bash
# Review the generated script first
less .merge-captain/cleanup-commands.sh

# Execute (with manual review per branch)
bash .merge-captain/cleanup-commands.sh
```

**Or manually execute for specific categories**:

```bash
# Close ancient branches (PRIORITY 1 - SAFETY)
while IFS= read -r line; do
    branch=$(echo "$line" | awk '{print $1}')
    echo "Closing: $branch"
    gh pr close $(gh pr list --head "$branch" --json number -q '.[0].number') \
        --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Open fresh PR if still needed." \
        --delete-branch || true
done < .merge-captain/ancient-branches.txt

# Close already-merged branches
while IFS= read -r branch; do
    echo "Closing: $branch"
    gh pr close $(gh pr list --head "$branch" --json number -q '.[0].number') \
        --comment "Closing: Changes already merged into main" \
        --delete-branch || true
done < .merge-captain/already-merged-branches.txt
```

## Understanding the Categories

### Already Merged (Safe to Close)
- **Criteria**: 0 commits ahead of main
- **Risk**: None - changes already in main
- **Action**: Close immediately
- **Impact**: Reduces noise, clarifies active work

### Ancient Branches (CRITICAL DANGER)
- **Criteria**: > 7000 commits ahead of main
- **Risk**: **CATASTROPHIC** if merged
- **Action**: **Close immediately**
- **Impact**: Prevents accidental repository destruction

### Stale Auto-Remediation (Housekeeping)
- **Criteria**: auto-remediation branches older than cutoff date
- **Risk**: Low - superseded by newer state
- **Action**: Close to reduce clutter
- **Impact**: Keeps auto-remediation pipeline clean

### Distant Branches (Rebase Impractical)
- **Criteria**: > 150 commits behind main
- **Risk**: Medium - very likely conflicts, hard to rebase
- **Action**: Contact owner, assess if still relevant
- **Impact**: Identify branches that need owner decision

### Conflict-Prone (Rebase Needed)
- **Criteria**: > 100 commits behind main
- **Risk**: Medium - probable conflicts
- **Action**: Rebase or close if stale
- **Impact**: Prevent merge conflicts

## Metrics

After running cleanup, track improvements:

```bash
# Total branch count
git branch -r | wc -l

# Open PRs
gh pr list --state open --limit 500 | wc -l

# Recent merges
gh pr list --state merged --limit 10

# Main velocity (commits in last 24h)
git log --oneline --since="24 hours ago" origin/main | wc -l
```

## Safety Guidelines

1. **Always review before executing**
   - Read `.merge-captain/ancient-branches.txt` before closing
   - Verify branches are truly ancient/abandoned
   - Check for ongoing work

2. **Priority order**
   1. Ancient branches (safety risk)
   2. Already-merged branches (quick wins)
   3. Stale auto-remediation (housekeeping)
   4. Coordinate with owners for distant/conflict-prone

3. **Communication**
   - Ancient branches: Tag in PR comment asking if still needed
   - Distant branches: Reach out to owner before closing
   - Already-merged: Just close with standard message

4. **Verification**
   - After cleanup, run triage again to see improvement
   - Monitor main branch velocity
   - Track PR age distribution

## Automation Recommendations

### GitHub Actions Workflow

```yaml
name: Branch Hygiene
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  branch-hygiene:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Run Branch Triage
        run: python3 scripts/merge-captain-triage.py

      - name: Upload Results
        uses: actions/upload-artifact@v6
        with:
          name: branch-triage-results
          path: .merge-captain/

      - name: Comment on Ancient Branches
        run: |
          # Auto-comment on ancient branch PRs
          while IFS= read -r line; do
            branch=$(echo "$line" | awk '{print $1}')
            gh pr comment $(gh pr list --head "$branch" --json number -q '.[0].number') \
              --body "⚠️ This branch is 7000+ commits diverged. Please rebase or close."
          done < .merge-captain/ancient-branches.txt
```

### Cron Job (Local)

```bash
# Add to crontab for weekly analysis
0 9 * * 1 cd /path/to/summit && python3 scripts/merge-captain-triage.py && mail -s "Branch Triage" you@example.com < .merge-captain/ancient-branches.txt
```

## Troubleshooting

### GitHub CLI Not Found

```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo apt-get update && sudo apt-get install -y gh
gh auth login
```

### Permission Denied

```bash
# Ensure scripts are executable
chmod +x scripts/merge-captain-*.sh scripts/merge-captain-*.py
```

### Git Fetch Fails

```bash
# Ensure you're in the repo root
cd "$(git rev-parse --show-toplevel)"

# Update remote
git remote update
```

## Related Documentation

- `GOLDEN_MAIN_STATUS_REPORT.md` - Initial comprehensive analysis
- `MERGE_CAPTAIN_UPDATE.md` - Velocity observations
- `MERGE_CAPTAIN_SUMMARY.md` - Strategic recommendations

## Contributing

To improve these tools:

1. Test with `python3 scripts/merge-captain-triage.py`
2. Verify output in `.merge-captain/`
3. Update this README with new features
4. Commit to `claude/merge-captain-setup-E1CRJ` branch

---

**Session**: `claude/merge-captain-setup-E1CRJ`
**Last Updated**: 2026-01-25
**Status**: Production Ready
