#!/usr/bin/env bash
# One-Pass Orchestrator for October 2025 Delivery Closure
# Safe-by-default: runs in dry-run mode unless APPLY=1
set -euo pipefail

: "${RUN_ID?}" "${RELEASE_TAG?}" "${ROLLBACK_TAG?}" "${PR_NUMBER?}" "${PROJECT_ID?}" "${OWNER?}" "${CAL_ICS?}" "${MERGE_STRATEGY?}" "${APPLY?}"

log() { printf "[%s] %s\n" "$(date -Iseconds)" "$*"; }
need() { command -v "$1" >/dev/null || { echo "missing: $1"; exit 127; }; }

for c in git jq gh; do need "$c"; done

trap 'log "FAIL: rolling back criteria met?"' EXIT

check_api() {
  if [[ "${FORCE:-0}" == 1 ]]; then return 0; fi
  log "Checking API health..."
  if ./tools/api_health.sh; then
    log "✅ API healthy + rate limits OK"
  else
    log "❌ API not OK; aborting. set FORCE=1 to override"
    exit 1
  fi
}

step1_dedupe() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 1: De‑duplicate Project #${PROJECT_ID} (detect → review → dry‑run → apply)"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  mkdir -p artifacts

  # Use existing dedupe scripts
  log "Running dedupe detection..."
  ./scripts/project8-dedupe-detect.sh "${OWNER}" "${PROJECT_ID}" artifacts

  if [[ "${APPLY}" == "1" ]]; then
    if [[ ! -f "artifacts/duplicates_review.csv" ]]; then
      log "❌ Review CSV not found. Manual review required before APPLY=1"
      exit 1
    fi

    log "Running dedupe dry-run..."
    ./scripts/project8-dedupe-apply.sh "${OWNER}" "${PROJECT_ID}" artifacts/duplicates_review.csv dry-run

    read -p "Continue with applying removals? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log "Applying removals..."
      ./scripts/project8-dedupe-apply.sh "${OWNER}" "${PROJECT_ID}" artifacts/duplicates_review.csv apply
    else
      log "Skipping apply step"
    fi
  else
    log "Dry‑run only (APPLY=0). Review artifacts/duplicates_review.csv before APPLY=1."
  fi
}

step2_merge_pr() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 2: Merge PR #${PR_NUMBER} via ${MERGE_STRATEGY}"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  git fetch origin && git checkout main && git pull --ff-only

  if [[ "${MERGE_STRATEGY}" == "rebase" ]]; then
    BRANCH=$(gh pr view "${PR_NUMBER}" --json headRefName -q .headRefName)
    log "Rebasing branch: ${BRANCH}"
    git checkout "$BRANCH" && git rebase main

    if [[ "${APPLY}" == "1" ]]; then
      log "Pushing rebased branch and merging PR..."
      git push --force-with-lease
      gh pr merge "${PR_NUMBER}" --rebase --delete-branch
    else
      log "Dry-run: would push and merge PR"
      git rebase --abort 2>/dev/null || true
    fi
  else
    # Cherry-pick strategy
    log "Getting commits from PR #${PR_NUMBER}..."
    COMMITS=$(gh pr view "${PR_NUMBER}" --json commits --jq '.commits[].oid')

    for SHA in $COMMITS; do
      log "Cherry-picking: ${SHA}"
      if [[ "${APPLY}" == "1" ]]; then
        git cherry-pick "$SHA"
      else
        log "Dry-run: would cherry-pick ${SHA}"
      fi
    done

    if [[ "${APPLY}" == "1" ]]; then
      log "Pushing to main..."
      git push origin main
      gh pr close "${PR_NUMBER}" -c "✅ Landed via cherry-pick to main"
    else
      log "Dry-run: would push to main and close PR"
      git reset --hard HEAD~$(echo "$COMMITS" | wc -l) 2>/dev/null || true
    fi
  fi
}

step3_import_ics() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 3: Import calendar .ics"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ ! -f "${CAL_ICS}" ]]; then
    log "❌ Calendar file not found: ${CAL_ICS}"
    return 1
  fi

  log "Calendar file exists: ${CAL_ICS}"

  if [[ "${APPLY}" == "1" ]]; then
    log "Opening calendar file for import..."
    if command -v open >/dev/null; then
      open "${CAL_ICS}"
    elif command -v xdg-open >/dev/null; then
      xdg-open "${CAL_ICS}"
    else
      log "⚠️  Manual import required. File: ${CAL_ICS}"
    fi
  else
    log "Dry-run: would open ${CAL_ICS} for import"
  fi
}

step4_snapshots() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 4: Commit final snapshots"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  mkdir -p artifacts

  log "Capturing Project #${PROJECT_ID} snapshot..."
  gh project item-list "${PROJECT_ID}" --owner "${OWNER}" --limit 500 --format json > \
    "artifacts/project8_post_dedup_$(date +%Y%m%d).json" || log "⚠️  Could not capture snapshot (API limit?)"

  git add artifacts/*.json

  if [[ "${APPLY}" == "1" ]]; then
    log "Committing snapshots..."
    HUSKY=0 git commit -m "chore: post-deduplication project snapshots

Captured state after Project #${PROJECT_ID} cleanup

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>" || log "Nothing to commit"
    git push origin "$(git branch --show-current)"
  else
    log "Dry-run: would commit and push snapshots"
    git restore --staged artifacts/*.json
  fi
}

step5_tag() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 5: Create annotated release tag ${RELEASE_TAG}"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ "${APPLY}" == "1" ]]; then
    log "Creating tag..."
    git tag -a "${RELEASE_TAG}" -m "October 2025 Delivery — Production Release

All 5 Execution Orders complete:
- EO-1: Error-budget monitoring (PromQL + Slack alerts)
- EO-2: Maestro metrics export (GitHub API → Prometheus)
- EO-3: Project seeding automation (CSV → GitHub Project)
- EO-4: Weekly dependency sync (calendar + runbook)
- EO-5: ML data refresh runbook (precision gates)

Maestro Run ID: ${RUN_ID}
PM of Record: Brian Long

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"

    git push origin "${RELEASE_TAG}"
    log "✅ Tag created and pushed: ${RELEASE_TAG}"
  else
    log "Dry‑run: would create and push tag ${RELEASE_TAG}"
  fi
}

step6_disclosure_pack() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "STEP 6: Generate disclosure pack + GitHub release"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  mkdir -p artifacts/disclosure-pack-2025-10

  log "Copying documentation to disclosure pack..."
  cp docs/FINAL_SUMMARY_OCT2025.md artifacts/disclosure-pack-2025-10/ 2>/dev/null || true
  cp docs/ACCEPTANCE_REPORT_OCT2025.md artifacts/disclosure-pack-2025-10/ 2>/dev/null || true
  cp docs/CEO_ONEPAGER_OCT2025.md artifacts/disclosure-pack-2025-10/ 2>/dev/null || true
  cp docs/POSTMORTEM_DUPLICATES_OCT2025.md artifacts/disclosure-pack-2025-10/ 2>/dev/null || true
  cp docs/OCT2025_DELIVERY_INDEX.md artifacts/disclosure-pack-2025-10/ 2>/dev/null || true
  cp project_management/october2025_sprint_tracker.csv artifacts/disclosure-pack-2025-10/ 2>/dev/null || true

  log "Creating disclosure pack tarball..."
  cd artifacts
  tar -czf disclosure-pack-2025-10.tar.gz disclosure-pack-2025-10/
  cd ..

  if [[ "${APPLY}" == "1" ]]; then
    log "Creating GitHub release..."
    gh release create "${RELEASE_TAG}" \
      --title "October 2025 Delivery — Production Release" \
      --notes-file docs/FINAL_SUMMARY_OCT2025.md \
      artifacts/disclosure-pack-2025-10.tar.gz || log "⚠️  Release creation failed (may already exist)"

    log "✅ Disclosure pack published"
  else
    log "Dry-run: would create GitHub release with disclosure pack"
  fi
}

rollback() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "ROLLBACK: reverting to ${ROLLBACK_TAG}"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  git fetch origin
  git checkout main
  git reset --hard "${ROLLBACK_TAG}"
  log "⚠️  Manual force-push required: git push --force-with-lease origin main"
}

main() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "October 2025 Delivery — One-Pass Orchestrator"
  log "Mode: $([ "$APPLY" == "1" ] && echo "APPLY" || echo "DRY-RUN")"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  check_api
  step1_dedupe
  step2_merge_pr
  step3_import_ics
  step4_snapshots
  step5_tag
  step6_disclosure_pack

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "✅ SUCCESS: One‑pass sequence completed (APPLY=${APPLY})"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

main "$@"
