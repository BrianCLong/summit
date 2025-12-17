#!/bin/bash
# close-stale-prs.sh

echo "Closing stale PRs (>90 days, no activity, draft status)..."

# Close draft PRs older than 90 days with no recent updates
gh pr list --state open --draft --limit 500 --json number,updatedAt,title | \
  jq -r '.[] | select(.updatedAt < (now - 7776000 | todate)) | .number' | \
  while read pr; do
    gh pr close $pr --comment "Closing stale draft PR (>90 days inactive). Please reopen if still relevant."
    echo "Closed PR #$pr"
    sleep 1 # Rate limit protection
  done

echo "Closing stale issues marked 'stale' or 'triage-needed'..."
gh issue list --state open --label "stale" --limit 500 --json number | \
  jq -r '.[].number' | \
  while read issue; do
    gh issue close $issue --comment "Auto-closing stale issue. Reopen if needed."
    echo "Closed issue #$issue"
    sleep 1
  done

echo "Done! Check remaining open PRs:"
gh pr list --state open | wc -l
