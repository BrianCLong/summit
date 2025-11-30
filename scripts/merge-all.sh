#!/usr/bin/env bash
set -euo pipefail

: "${DRY_RUN:=1}"   # 1 = print actions only, 0 = execute
: "${OWNER:=}"
: "${REPO:=}"

log(){ printf '%s\n' "$*" >&2; }
run(){ if [ "${DRY_RUN}" = "1" ]; then log "[DRY_RUN] $*"; else eval "$@"; fi; }

require_cmd(){ command -v "$1" >/dev/null || { echo "Missing $1"; exit 127; }; }
require_cmd gh
require_cmd jq

# Discover repo owner/name if not provided
if [ -z "${OWNER}" ] || [ -z "${REPO}" ]; then
  repo_view=$(gh repo view --json name,owner --jq '.')
  OWNER=${OWNER:-$(printf '%s' "$repo_view" | jq -r '.owner.login')}
  REPO=${REPO:-$(printf '%s' "$repo_view" | jq -r '.name')}
fi

REPO_FULL="${OWNER}/${REPO}"

# Resolve default branch
DEFAULT_BRANCH="$(gh repo view "${REPO_FULL}" --json defaultBranchRef --jq '.defaultBranchRef.name')"
log "Default branch: ${DEFAULT_BRANCH}"

# Get required status checks (best effort; still defer to server enforcement)
PROT_JSON="$(gh api -X GET "repos/${OWNER}/${REPO}/branches/${DEFAULT_BRANCH}/protection" 2>/dev/null || true)"

# Fetch PRs labeled ready
PRS_JSON="$(gh pr list -R "${REPO_FULL}" --state open --label 'ready-to-merge,automerge' --json number,title,headRefName,baseRefName,isDraft,mergeStateStatus,labels,author,headRepositoryOwner,url,body)"
COUNT="$(jq 'length' <<<"$PRS_JSON")"
log "Eligible PR candidates: ${COUNT}"

# Build dependency graph: parse "Depends on #123" lines
# Make edges A->B when A depends on B (merge B first)
EDGES="$(jq -r '
  to_entries[] as $e |
  ($e.value.number|tostring) as $id |
  ($e.value.body // "" | scan("(?:^|\\n)\\s*Depends on\\s+#([0-9]+)")) as $deps |
  ($deps[]? | "\($id) \(. )")
' <<<"$PRS_JSON" || true)"

# Topological order helper (simple Kahn on IDs)
# If no deps, just list PR IDs
PR_IDS="$(jq -r '.[].number' <<<"$PRS_JSON" | sort -n | tr '\n' ' ')"

order_prs(){
  # naive topo: repeatedly append nodes with no unmet deps
  local ids="$1" edges="$2"
  local ordered=""
  local todo="$ids"
  while [ -n "$todo" ]; do
    local progressed=0
    for id in $todo; do
      local needed
      needed="$(awk -v id="$id" '$1==id {print $2}' <<<"$edges" | xargs -n1 echo | tr '\n' ' ' | sed 's/ $//')" || true
      local unmet=0
      for d in $needed; do
        if grep -qE "(^| )$d( |$)" <<<"$todo"; then unmet=1; break; fi
      done
      if [ "$unmet" -eq 0 ]; then
        ordered="$ordered $id"
        todo="$(sed -E "s/(^| )$id( |$)/ /" <<<" $todo " | xargs)"
        progressed=1
      fi
    done
    [ "$progressed" -eq 1 ] || { # cycle or unresolved; append remaining as-is
      ordered="$ordered $todo"; break;
    }
  done
  echo "$ordered" | xargs
}

ORDERED_IDS="$(order_prs "$PR_IDS" "$EDGES")"
log "Planned merge order: ${ORDERED_IDS:-<none>}"

# Helper: merge one PR if green & mergeable
merge_one(){
  local id="$1"
  local prj
  prj="$(jq --argjson id "$id" '.[] | select(.number==$id)' <<<"$PRS_JSON")"
  [ -n "$prj" ] || { log "PR #$id not found in set"; return 0; }

  local isDraft
  isDraft="$(jq -r '.isDraft' <<<"$prj")"
  [ "$isDraft" = "false" ] || { log "PR #$id is draft; skipping"; return 0; }

  # Live view for statuses
  local ms
  ms="$(gh pr view -R "${REPO_FULL}" "$id" --json mergeStateStatus,isCrossRepository,headRefOid,commits --jq '.mergeStateStatus')"
  case "$ms" in
    "CLEAN"|"HAS_HOOKS"|"UNSTABLE")
      ;; # potentially mergeable; checks may still be running for UNSTABLE
    "BLOCKED")
      log "PR #$id blocked by checks/reviews. Labeling."
      run gh pr edit -R "${REPO_FULL}" "$id" --add-label "blocked/ci"
      return 0;;
    "DIRTY")
      log "PR #$id has conflicts. Labeling + comment."
      run gh pr edit -R "${REPO_FULL}" "$id" --add-label "blocked/conflict"
      run gh pr comment -R "${REPO_FULL}" "$id" --body "Merge conflict detected. Please rebase on \`${DEFAULT_BRANCH}\`."
      return 0;;
    *)
      log "PR #$id state=$ms; skipping for safety"; return 0;;
  esac

  log "Merging PR #$id…"
  run gh pr merge -R "${REPO_FULL}" "$id" --merge --delete-branch --auto
}

# Execute merges
for id in $ORDERED_IDS; do
  merge_one "$id"
done

# Optional: sweep non-PR branches (open draft PRs)
: "${SWEEP_BRANCHES:=0}"
if [ "$SWEEP_BRANCHES" = "1" ]; then
  log "Sweeping stray branches into draft PRs…"
  # list remote branches ahead of default
  mapfile -t branches < <(gh api "repos/${OWNER}/${REPO}/branches?per_page=100" | jq -r '.[].name' | grep -vE "^(${DEFAULT_BRANCH}|release/|wip/|archive/)$")
  for br in "${branches[@]}"; do
    ahead="$(gh api "repos/${OWNER}/${REPO}/compare/${DEFAULT_BRANCH}...${br}" | jq -r '.ahead_by')"
    [ "${ahead}" = "0" ] && continue
    title="Branch sweep: ${br}"
    exists="$(gh pr list -R "${REPO_FULL}" --head "${OWNER}:${br}" --json number --jq 'length')"
    if [ "$exists" -eq 0 ]; then
      log "Opening draft PR for ${br} (ahead by ${ahead})"
      run gh pr create -R "${REPO_FULL}" --head "${br}" --base "${DEFAULT_BRANCH}" --draft --title "$title" --body "Automated sweep PR to reconcile branch \`${br}\` into \`${DEFAULT_BRANCH}\`."
    fi
  done
fi

# Cut a prerelease tag with generated notes
: "${CUT_RELEASE:=1}"
if [ "$CUT_RELEASE" = "1" ]; then
  TAG="v0.0.0-merge-$(date +%Y%m%d-%H%M)"
  log "Creating prerelease ${TAG}…"
  NOTES="$(gh api -X POST "repos/${OWNER}/${REPO}/releases/generate-notes" -f tag_name="${TAG}" -f target_commitish="${DEFAULT_BRANCH}" | jq -r '.body')"
  run gh release create "${TAG}" --repo "${REPO_FULL}" --prerelease --notes "$NOTES"
fi

log "Done."
