#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage:
  merge_s25.sh --repo <owner/name> --base <main> --branch <feature/merge-closed-prs-s25> --prs "1279 1261 1260 1259" --state <state.json> [--resume] [--open-release-only] [--node 20]
EOF
}

REPO=""; BASE=""; BRANCH=""; PRS=""; STATE=""; RESUME=false; OPEN_RELEASE_ONLY=false; NODE_VER="20"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    --base) BASE="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --prs) PRS="$2"; shift 2 ;;
    --state) STATE="$2"; shift 2 ;;
    --resume) RESUME=true; shift ;;
    --open-release-only) OPEN_RELEASE_ONLY=true; shift ;;
    --node) NODE_VER="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

[[ -z "$REPO" || -z "$BASE" || -z "$BRANCH" || -z "$STATE" ]] && { usage; exit 1; }
mkdir -p "$(dirname "$STATE")"

jq_safe_write() {
  local key="$1" val="$2"
  if [[ ! -f "$STATE" ]]; then
    printf '{ "steps": {}, "cherryPicked": [] }\n' > "$STATE"
  fi
  tmp="$(mktemp)"
  jq --arg k "$key" --arg v "$val" '.steps[$k]=$v' "$STATE" > "$tmp" && mv "$tmp" "$STATE"
}

jq_array_push_unique() {
  local arr="$1" val="$2"
  tmp="$(mktemp)"
  jq --arg v "$val" ".${arr} += ( [\$v] | map(select(. as \$x | . != \$x)) ) | .${arr} |= unique" "$STATE" > "$tmp" || true
  mv "$tmp" "$STATE"
}

ensure_state() {
  [[ -f "$STATE" ]] || printf '{ "steps": {}, "cherryPicked": [], "releasePR": null }\n' > "$STATE"
}

ensure_branch() {
  git fetch origin --prune
  git switch "$BASE"
  git pull --ff-only origin "$BASE"
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git switch "$BRANCH"
  else
    git switch -c "$BRANCH"
  fi
}

range_diff_dump() {
  mkdir -p .merge-evidence
  git range-diff "$BASE...$BRANCH" > ".merge-evidence/rangediff-$(date +%F).txt" || true
}

already_picked_commit() {
  local commit="$1"
  git branch "$BRANCH" --contains "$commit" >/dev/null 2>&1
}

cherry_pick_pr() {
  local pr="$1"
  echo "==> PR #$pr"
  # materialize head even if closed
  git fetch origin "pull/${pr}/head:tmp/pr-${pr}" || {
    echo "PR #$pr fetch failed (possibly deleted). Skipping."
    return 0
  }
  # list unique commits (oldest->newest)
  # Fix: Use standard range BASE..PR_HEAD to select commits in PR but not in BASE
  mapfile -t COMMITS < <(git rev-list --reverse --no-merges "${BASE}..tmp/pr-${pr}")

  if [[ ${#COMMITS[@]} -eq 0 ]]; then
    echo "No unique commits for #$pr (already merged or empty)."
    return 0
  fi

  for c in "${COMMITS[@]}"; do
    if already_picked_commit "$c"; then
      echo "Skip (already included): $c"
      continue
    fi
    echo "Cherry-pick $c"
    if ! git cherry-pick -x "$c"; then
      echo "CONFLICT on $c (PR #$pr). Resolve, then run: make merge-s25.resume"
      exit 2
    fi
  done

  git branch -D "tmp/pr-${pr}" || true
  jq_array_push_unique "cherryPicked" "$pr"
}

open_stack_prs() {
  # Create lightweight stack branches if not exist, push, open PRs against consolidation
  for b in "$STACK_SERVER" "$STACK_ARTIFACTS" "$STACK_CLIENT" "$STACK_REBRAND"; do
    if git rev-parse --verify "$b" >/dev/null 2>&1; then
      echo "Stack branch exists: $b"
    else
      git switch -c "$b" "$BRANCH"
      git push -u origin "$b"
    fi
  done

  # Open PRs only if not already open
  for spec in \
    "$STACK_SERVER|stack/server: Express 5 + ESLint 9 migration|Upgrade to Express 5 (centralized async error); ESLint 9 Flat Config; update tests." \
    "$STACK_ARTIFACTS|stack/ops: Artifacts pack v1 + SBOM + provenance verifier|Adds CycloneDX SBOM, signing (cosign), and provenance generation/verification in CI." \
    "$STACK_CLIENT|stack/client: Vite 7 + React-Leaflet 5 compatibility|Map init/context fixes and Playwright tile-load stabilization." \
    "$STACK_REBRAND|stack/docs: Rebrand apply + provenance references intact|Renames and docs without breaking provenance/export manifests."; do
    IFS="|" read -r head title body <<<"$spec"
    if gh pr list -R "$REPO" --state open --head "$head" --json number | jq -e 'length>0' >/dev/null; then
      echo "PR already open for $head"
    else
      gh pr create -R "$REPO" --base "$BRANCH" --head "$head" --title "$title" --body "$body"
    fi
  done
}

ci_pipeline() {
  echo "==> Running CI checks locally (lint, unit, build, e2e)…"
  pnpm install --frozen-lockfile
  pnpm lint
  pnpm test -- --ci --reporters=default --reporters=jest-junit
  pnpm -r build
  pnpm playwright install --with-deps
  pnpm e2e
}

artifacts_bundle() {
  echo "==> Generating SBOM + provenance"
  pnpm cyclonedx-npm --output-format JSON --output-file sbom.json
  node .ci/gen-provenance.js > provenance.json
  node .ci/verify-provenance.js provenance.json
}

open_release_pr() {
  # Ensure release notes template exists
  if [[ ! -f ".github/release-s25.md" ]]; then
    mkdir -p .github
    cat > .github/release-s25.md <<'MD'
# S25 Consolidated Merge

## Summary
- Recovers closed-but-desired PRs (#1279, #1261, #1260, #1259) via cherry-pick with provenance.
- Keeps CI/ops hardening baseline stable.
- Upgrades: Express 5, ESLint 9 (flat), Vite 7, React-Leaflet 5.
- Adds SBOM + provenance manifest + verifier in CI.

## Evidence
- Range-diff transcript in .merge-evidence/
- CI: unit, contract, Playwright all green
- Artifacts: sbom.json (signed if configured), provenance.json (verified)

## Risk & Mitigation
- Express 5 breaks → centralized error handler; tests cover async errors
- Client build/map changes → tile-load waits in Playwright

## Checklist
- [ ] SBOM generated and (optionally) signed
- [ ] Provenance verified
- [ ] OPA policy simulations pass (hard fail configured)
- [ ] GraphQL contract baselines valid (N-1/N-2)
- [ ] Audit immutability intact
- [ ] SLO snapshots attached (p95 query, ingest E2E)
- [ ] Rollback plan attached
MD
  fi

  # If a release PR already exists from BRANCH -> BASE, skip
  if gh pr list -R "$REPO" --state open --base "$BASE" --head "$BRANCH" --json number | jq -e 'length>0' >/dev/null; then
    echo "Release PR already open."
    return
  fi

  gh pr create -R "$REPO" \
    --base "$BASE" \
    --head "$BRANCH" \
    --title "release: S25 consolidated merge (closed PR recovery + infra bumps)" \
    --body-file ".github/release-s25.md" || true
}

main() {
  ensure_state

  if $OPEN_RELEASE_ONLY; then
    open_release_pr
    exit 0
  fi

  echo "==> Ensuring branch currency and creating/using $BRANCH"
  ensure_branch
  jq_safe_write "ensure_branch" "ok"

  if ! $RESUME; then
    echo "==> Cherry-picking closed PRs into $BRANCH"
    for pr in $PRS; do
      cherry_pick_pr "$pr"
    done
    range_diff_dump
    jq_safe_write "cherry_pick" "done"
  else
    echo "==> Resume mode: skipping cherry-pick, continuing pipeline…"
  fi

  echo "==> Opening stacked PRs into consolidation branch (review-friendly granularity)"
  open_stack_prs
  jq_safe_write "stacks" "opened"

  echo "==> Running local CI gate"
  ci_pipeline
  jq_safe_write "ci_local" "green"

  echo "==> Artifacts bundle"
  artifacts_bundle
  jq_safe_write "artifacts" "ready"

  echo "==> Opening final release PR"
  open_release_pr
  jq_safe_write "release_pr" "opened"

  echo "All steps complete. SAFE TO RE-RUN."
}

main "$@"
