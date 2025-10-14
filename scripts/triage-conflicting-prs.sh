#!/usr/bin/env bash
set -euo pipefail

# Triage and label PRs with merge conflicts that are stale (>90 days)
# Part of merge train health management

LABELS="needs-rebase,stale"
STALE_DAYS=90
DRY_RUN="${DRY_RUN:-0}"

COMMENT_TMPL=$(cat <<'EOT'
⚠️ **Merge Conflict Detected - Action Required**

This PR currently has merge conflicts and has been open for more than 90 days.

**Next steps to resolve:**
1. Update your local branch:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. Resolve conflicts locally
3. Push updates: `git push --force-with-lease`

**Alternative:** If this work is no longer needed, please close this PR to keep our queue healthy.

If there is no activity within **14 days**, this PR will be automatically closed. You can always reopen it after addressing the conflicts.

---
🤖 *This is an automated message from the merge train health system*
EOT
)

echo "=== Merge Train: Triaging Conflicting PRs ===" >&2
echo "Stale threshold: ${STALE_DAYS} days" >&2
echo "Dry run mode: ${DRY_RUN}" >&2
echo "" >&2

# Calculate cutoff timestamp (90 days ago)
CUTOFF=$(date -u -d "${STALE_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-${STALE_DAYS}d +%Y-%m-%dT%H:%M:%SZ)

echo "Finding PRs with conflicts older than ${CUTOFF}..." >&2

gh pr list --state open --limit 500 --json number,createdAt,mergeable,title | \
  jq -r --arg cutoff "$CUTOFF" '.[] | select(.mergeable == "CONFLICTING" and .createdAt < $cutoff) | "\(.number)\t\(.title)\t\(.createdAt)"' | \
  while IFS=$'\t' read -r pr title created; do
    echo "PR #${pr}: ${title}" >&2
    echo "  Created: ${created}" >&2

    if [ "$DRY_RUN" = "1" ]; then
      echo "  [DRY RUN] Would label: ${LABELS}" >&2
      echo "  [DRY RUN] Would comment with rebase instructions" >&2
    else
      echo "  Labeling: ${LABELS}" >&2
      gh pr edit "$pr" --add-label "$LABELS" 2>&1 | sed 's/^/    /' || echo "    ⚠️ Failed to label" >&2

      echo "  Adding comment..." >&2
      echo "$COMMENT_TMPL" | gh pr comment "$pr" --body-file - 2>&1 | sed 's/^/    /' || echo "    ⚠️ Failed to comment" >&2
    fi

    echo "" >&2
  done

echo "=== Triage complete ===" >&2
