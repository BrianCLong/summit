# Draft PR Conveyor Policy

**ID**: POLICY-PR-002
**Status**: Active
**Enforcement**: Automated (CI)

## Objective
To prevent the accumulation of stale work-in-progress (WIP) and ensure the Merge Queue remains fluid and high-velocity.

## Policy Rules

### 1. Maximum Draft Age
A Pull Request (PR) may remain in `Draft` state for a maximum of **30 days**.
*   **Action**: After 30 days, the PR must be either:
    *   Marked `Ready for Review`.
    *   Closed.
    *   Updated with a fresh commit (resetting the timer).

### 2. Mandatory Classification
All Draft PRs must have one of the following labels to indicate intent:
*   `status/wip`: Active work in progress.
*   `status/experimental`: Proof of concept, may not land.
*   `status/blocked`: Waiting on upstream dependency.

### 3. Ownership
Every Draft PR must have a clear **Assignee**. Unassigned drafts are subject to immediate closure after 7 days of inactivity.

### 4. Promotion Checklist
Before converting from Draft to Ready, the author must complete:
*   [ ] Self-review of changes.
*   [ ] CI passing (or known failures documented).
*   [ ] "What changed" description updated.

## Enforcement Plan (CI)

The following logic defines how this policy is enforced by the `pr-drafts/check-stale.sh` script (CI Job: `check-stale-drafts`).

```bash
#!/bin/bash
# Logic for Stale Draft Detection

# 1. Find Stale Drafts
STALE_DATE=$(date -d "30 days ago" +%Y-%m-%d)
echo "Scanning for drafts older than $STALE_DATE..."

gh pr list --state open --draft --json number,updatedAt,url,author \
  --jq ".[] | select(.updatedAt < \"${STALE_DATE}T00:00:00Z\")" > stale_drafts.json

# 2. Action: Notify or Close
# (In Advisory Mode: Comment on PR)
# (In Enforcement Mode: Close PR)

if [ -s stale_drafts.json ]; then
  echo "Found $(wc -l < stale_drafts.json) stale drafts."
  # For each draft, post a comment:
  # "This Draft PR has been inactive for >30 days. Please update or close."
  exit 1 # Fail CI to alert maintainers
fi
```

## Remediation
*   **If your PR is closed**: You may reopen it when you are ready to resume active work.
*   **If you need an exception**: Add the label `exemption/long-running`.
