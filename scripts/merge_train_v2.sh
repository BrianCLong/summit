#!/usr/bin/env bash
set -euo pipefail

# Config
: "${HISTTIMEFORMAT:=}" || true
BASE=${BASE:-main}
BATCH_SIZE=${BATCH_SIZE:-3}
LOG_JSON=${LOG_JSON:-merge-train.jsonl}

log() { printf "[%s] %s\n" "$(date -u +%FT%TZ)" "$*"; }

# Ensure a PR exists for head branch $1; returns PR number
ensure_pr() {
  local br="$1" pr
  if pr=$(gh pr list --state open --head "$br" --json number -q '.[0].number' 2>/dev/null); then
    if [[ -n "${pr:-}" && "${pr}" != "null" ]]; then echo "$pr"; return 0; fi
  fi
  # Create a draft to start CI if none exists
  if pr=$(gh pr create -H "$br" -B "$BASE" -t "[AUTO] $br" -b "Auto-opened by merge train" --draft 2>/dev/null); then
    gh pr view "$pr" --json number -q .number
  else
    echo ""; return 1
  fi
}

# Prepare a clean prep branch and create a PREP PR; echos new PR number
prep_branch() {
  local br="$1" orig_pr="$2"
  if ! git ls-remote --exit-code --heads origin "$br" >/dev/null 2>&1; then
    log "skip: origin/$br not found"; echo ""; return 0
  fi
  git fetch origin "+refs/heads/$br:refs/remotes/origin/$br" --prune --quiet || true
  git switch --discard-changes -C "prep/$br" "origin/$br" >/dev/null

  git fetch origin --quiet || true
  if ! git rebase "origin/$BASE" >/dev/null 2>&1; then
    git rebase --abort || true
    git merge --no-ff --no-edit "origin/$BASE" || true
  fi

  # Only staged updates/removals; do not add untracked files
  git add -u || true
  if ! git diff --cached --quiet; then
    git commit -s -m "chore(prep): reconcile with origin/$BASE (no new files)"
  fi
  git push --force-with-lease -u origin "prep/$br" >/dev/null 2>&1 || true

  # Cannot retarget head; create PREP PR that supersedes the original
  local old_url title body new_url new_num
  old_url=$(gh pr view "$orig_pr" --json url -q .url || echo "")
  title=$(gh pr view "$orig_pr" --json title -q .title || echo "$br")
  body=$(gh pr view "$orig_pr" --json body -q .body || echo "")
  new_url=$(gh pr create -B "$BASE" -H "prep/$br" -t "[PREP] ${title}" -b "${body}

Supersedes: ${old_url}" || echo "")
  if [[ -n "$new_url" ]]; then
    new_num=$(gh pr view "$new_url" --json number -q .number || echo "")
    gh pr comment "$orig_pr" --body "Superseded by ${new_url}. Original left pristine for audit/revert." >/dev/null 2>&1 || true
    echo "$new_num"; return 0
  fi
  echo ""; return 0
}

run_batch() {
  local -a TARGETS=()
  mapfile -t TARGETS < <(git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/heads | head -n "$BATCH_SIZE")
  : > "$LOG_JSON"
  for br in "${TARGETS[@]}"; do
    [[ -n "$br" ]] || continue
    log "Processing $br"
    local orig_pr pr row
    orig_pr=$(ensure_pr "$br" || true)
    [[ -n "${orig_pr:-}" ]] || { log "no PR for $br"; continue; }

    pr=$(prep_branch "$br" "$orig_pr" || true)
    [[ -n "${pr:-}" ]] || pr="$orig_pr"

    gh pr merge "$pr" --auto >/dev/null 2>&1 || true

    row=$(gh pr view "$pr" --json number,url,title,baseRefName,headRefName,isDraft,mergeStateStatus,statusCheckRollup,mergeCommit 2>/dev/null \
      | jq 'try . as $d | {
          number, url, title,
          base: .baseRefName, head: .headRefName,
          isDraft,
          mergeStateStatus,
          allChecksGreen: ((.statusCheckRollup | if type=="array" then . else [] end) | all(.conclusion=="SUCCESS" or .conclusion=="NEUTRAL")),
          securityCriticalsCleared: ((.statusCheckRollup | if type=="array" then . else [] end)
             | map(select((.name // "") | test("codeql|security"; "i") and (.conclusion!="SUCCESS"))) | length==0),
          mergeSHA: (.mergeCommit.oid // "")
        } catch { number: -1, url: "", title: "unreadable", base: "", head: "", isDraft: true, mergeStateStatus: "UNKNOWN", allChecksGreen: false, securityCriticalsCleared: false, mergeSHA: "" }' || echo '{}')
    echo "$row" >> "$LOG_JSON"
  done
  log "Batch done; log: $LOG_JSON"
}

run_batch
