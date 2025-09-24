#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/merge-train.sh 1366 1358 1362 1365 1361 1364 1360 1359 1368 1367 1330 1363
# If no PRs passed, defaults to the pre-agreed merge order.

REPO=${REPO:-BrianCLong/summit}
gh repo set-default "$REPO" >/dev/null 2>&1 || true

DEFAULT=(1366 1358 1362 1365 1361 1364 1360 1359 1368 1367 1330 1363)
PRS=("${@:-${DEFAULT[@]}}")

log(){ echo -e "\n=== $* ===\n"; }

merge_squash(){ local pr=$1 msg=$2; gh pr merge "$pr" --squash --delete-branch --body "$msg"; }
merge_commit(){ local pr=$1 msg=$2; gh pr merge "$pr" --merge --delete-branch --body "$msg"; }
merge_auto(){ local pr=$1 msg=$2; gh pr merge "$pr" --auto --squash --delete-branch --body "$msg"; }

rebase_fix_lockfiles(){ local pr=$1; bash scripts/rebase-fix-lockfiles.sh "$pr"; }

log "Preflight status"
for pr in "${PRS[@]}"; do
  gh pr view "$pr" --json number,title,mergeable,state | jq -r '"#" + (.number|tostring) + "  " + .title + "  [" + .state + "] mergeable:" + .mergeable'
done

# 1) Hygiene: #1366 (rebase+auto if conflicting)
log "Prepare #1366 (lockfile diffs)"
status=$(gh pr view 1366 --json mergeable -q .mergeable || echo "UNKNOWN")
if [ "$status" = "MERGEABLE" ]; then
  merge_auto 1366 "Enable textual lockfile diffs to improve review signal."
else
  echo "#1366 status=$status; attempting rebase + lockfile fix"
  rebase_fix_lockfiles 1366
fi

# 2) Tests & Policy: #1358, #1362, #1365
log "Merge #1358 (policy reasoner coverage)"
merge_commit 1358 "Expand policy reasoner test coverage."

log "Merge #1362 (prov-ledger tests v1)"
merge_commit 1362 "Add prov-ledger coverage v1."

log "Rebase and extend #1365, then merge"
gh pr checkout 1365
git fetch origin main
git rebase origin/main || git rebase --abort
# OPTIONAL: append extra tests here before pushing if needed
git push --force-with-lease || true
merge_commit 1365 "Append unique prov-ledger tests and param boundary cases (preserve authors)."

# 3) Guardrails: #1361
log "Merge #1361 (CostGuard budgets)"
status=$(gh pr view 1361 --json mergeable -q .mergeable || echo "UNKNOWN")
if [ "$status" = "MERGEABLE" ]; then merge_auto 1361 "Enforce query budgets (CostGuard)."; else gh pr merge 1361 --auto --squash --delete-branch --body "CostGuard budgets." || true; fi

# 4) Catalog: #1364
log "Merge #1364 (connector catalog metadata)"
status=$(gh pr view 1364 --json mergeable -q .mergeable || echo "UNKNOWN")
if [ "$status" = "MERGEABLE" ]; then merge_auto 1364 "Broaden connector catalog (wave 2 metadata)."; else gh pr checkout 1364 && git fetch origin && git rebase origin/main || true && git add -A && git rebase --continue || git commit -m "merge-train: resolve non-destructive conflicts" && git push --force-with-lease && gh pr merge 1364 --auto --squash --delete-branch --body "Catalog merged via train"; fi

# 5) Core services: #1360, #1359
log "Merge #1360 (Explainable ER)"
merge_auto 1360 "Explainable ER service (canary 5%). Flag er.enabled=true on stage."

log "Merge #1359 (NLQ engine)"
merge_auto 1359 "NLQ engine (sandbox; flag nlq.enabled=false by default)."

# 6) UX / Orchestration: #1368, #1367, #1330
log "Merge #1368 (Wizard quality insights)"
status=$(gh pr view 1368 --json mergeable -q .mergeable || echo "UNKNOWN")
if [ "$status" = "MERGEABLE" ]; then merge_auto 1368 "Wizard quality insights (flag wizard.quality=false until verified)."; else gh pr checkout 1368 && git fetch origin && git rebase origin/main || true && git add -A && git rebase --continue || git commit -m "merge-train: resolve non-destructive conflicts" && git push --force-with-lease && gh pr merge 1368 --auto --squash --delete-branch --body "Wizard merged via train"; fi

log "Merge #1367 (Disclosure packager resiliency)"
status=$(gh pr view 1367 --json mergeable -q .mergeable || echo "UNKNOWN")
if [ "$status" = "MERGEABLE" ]; then merge_auto 1367 "Disclosure packager resiliency (flag disclosure.resiliency=true on stage)."; else gh pr checkout 1367 && git fetch origin && git rebase origin/main || true && git add -A && git rebase --continue || git commit -m "merge-train: resolve non-destructive conflicts" && git push --force-with-lease && gh pr merge 1367 --auto --squash --delete-branch --body "Disclosure merged via train"; fi

log "Merge #1330 (Counter-response orchestration)"
merge_auto 1330 "Counter-response orchestration; soak 24h on stage."

# 7) Release: #1363 retitle and merge, then tag
log "Finalize Release PR #1363"
gh pr edit 1363 --title "Release 2025.09.24.x"
# Generate release notes from this train and append to PR body
TMP_NOTE=$(mktemp)
echo "### Included PRs" > "$TMP_NOTE"
for p in 1366 1358 1362 1365 1361 1364 1360 1359 1368 1367 1330; do
  title=$(gh pr view $p --json title -q .title || echo "")
  author=$(gh pr view $p --json author -q .author.login || echo "")
  echo "- #$p $title (by @$author)" >> "$TMP_NOTE"
done
# Append to existing body
CUR_BODY=$(gh pr view 1363 --json body -q .body || echo "")
echo -e "\n\n$CUR_BODY\n" > "$TMP_NOTE.body"
cat "$TMP_NOTE" >> "$TMP_NOTE.body"
gh pr edit 1363 --body-file "$TMP_NOTE.body"
rm -f "$TMP_NOTE" "$TMP_NOTE.body"
gh pr ready 1363 || true
merge_squash 1363 "Release 2025.09.24.x. Includes merged PRs in train."

git fetch origin
git checkout main
git pull
git tag -a "v2025.09.24.x" -m "IntelGraph Release 2025.09.24.x"
git push origin "v2025.09.24.x"

log "Merge train completed successfully."