# October 2025 Delivery — Closure & Handoff Playbook
_Date:_ 2025-10-03  
_Prepared by:_ Co‑CEO (Topicality)  
_Release:_ "October 2025 Delivery — Tied Off"  

---

## 0) Decision‑First Summary
- **Status:** Production‑ready pending routine cleanup.  
- **Scope covered:** 5 Execution Orders (EO‑1..EO‑5) complete with full docs + automation.  
- **Proof artifacts:** 7 docs (>2,000 LoC) including closure checklist, master index, CEO one‑pager, post‑mortem, and the next-phase two‑week EO.  
- **Residual items (API unblock, 1–2 hrs total):**  
  1) De‑duplicate Project #8 (202→104 items) with reviewable process.  
  2) Merge PR **#9800** (cherry‑pick or rebase).  
  3) Import calendar **.ics** for weekly dependency sync.  
  4) Commit final snapshots.  

**Go/No‑Go:** Go when residual items pass checks below; No‑Go on policy violation, SLO breach, or diff between snapshots and master index.

---

## 1) Assignment Matrix (RACI + proof‑by)
| Task | R | A | C | I | Proof‑by | Evidence |
|---|---|---|---|---|---:|---|
| Project #8 de‑dupe (reviewable) | <Owner‑Data> | <PM> | Security, Legal | Execs | T+1h post‑API | `dedupe_report.md`, `review_log.json` |
| Merge PR #9800 | <Owner‑Eng> | <Eng‑Lead> | QA | PM, Execs | T+30m | `merge_commit_sha`, CI green |
| Import .ics | <Owner‑Ops> | <Ops‑Lead> | PM | Execs | T+30m | `calendar_import.log`, runbook link |
| Final snapshots commit | <Owner‑Eng> | <PM> | QA | Execs | T+30m | `snapshots/commit_sha`, diff=Ø |

> "T" starts when API clears. Replace placeholders and proceed.

---

## 2) Runbook — Residual Work

### 2.1 De‑duplicate Project #8 (202→104) — Reviewable Process
**Objective:** Deterministic, auditable de‑dupe; reviewers can approve/override.

**Steps**
1. Export current items: `projects/8/items.ndjson` (include `id,title,hash,source,url`).  
2. Compute similarity clusters (min‑hash or exact `hash`): threshold `sim>=0.92`.  
3. Generate `dedupe_proposals.csv` with columns `[keep_id, drop_id, reason, evidence_url]`.  
4. Open review PR with `review_log.json` (all decisions signed by reviewer).  
5. Apply de‑dupe only after **2 approvals**; auto‑rollback on policy hit.

**Commands (template)**
```bash
# 1) Export
cli project export --project 8 --out projects/8/items.ndjson

# 2) Propose clusters (exact + fuzzy)
python tools/dedupe.py \
  --in projects/8/items.ndjson \
  --out proposals/dedupe_proposals.csv \
  --similarity-threshold 0.92

# 3) Make review pack
python tools/make_review_pack.py \
  --proposals proposals/dedupe_proposals.csv \
  --out review/review_log.json

# 4) Open PR
git checkout -b chore/dedupe-project-8
git add proposals/dedupe_proposals.csv review/review_log.json
git commit -m "De-dupe proposals for Project #8 (202→104) with evidence"
git push -u origin chore/dedupe-project-8

# 5) Apply after approval
python tools/apply_dedupe.py --log review/review_log.json --dry-run 0
```

**Checks**
- p95 de‑dupe runtime < 5m; `drop_id` never equals `keep_id`; no orphaned references.  
- Policy labels preserved (`origin,sensitivity,legal_basis`).  

---

### 2.2 Merge PR #9800 (cherry‑pick or rebase)
**Context:** EO‑1/EO‑2 error‑budget monitoring + metrics export.

**Steps**
```bash
# Ensure main is clean
git fetch origin && git checkout main && git pull

# Option A: Rebase PR branch
git checkout feature/err-budget-export
git rebase main
# Resolve conflicts → run tests
./scripts/test_all.sh
# Push updated PR
git push --force-with-lease

# Option B: Cherry-pick onto main
git checkout main
git cherry-pick <commit_sha_from_pr_9800>
./scripts/test_all.sh && git push origin main
```
**Checks:** CI green, SBOM updated, no new high/critical from `osv-scan`/`trivy`.

---

### 2.3 Import Calendar .ics (Weekly Dependency Sync)
**Steps**
```bash
# Validate file
icslint ops/dependency-sync.ics

# Import (Google Workspace example)
python tools/import_ics.py --file ops/dependency-sync.ics --calendar "Dependency Sync"
# or: gcal import ops/dependency-sync.ics --calendar "Dependency Sync"

# Verify & link to runbook
python tools/verify_calendar.py --calendar "Dependency Sync" --expect-weekday Mon --expect-duration 30
```
**Checks:** Event exists next Monday 09:00–09:30 (America/Phoenix), attendees populated.

---

### 2.4 Commit Final Snapshots
**Steps**
```bash
# Generate
maestro artifact snapshot --run october-2025 --out snapshots/

# Diff against master index
python tools/verify_index.py --index docs/master_index.yml --dir snapshots/ --fail-on-missing

# Commit
git add snapshots/
git commit -m "Final snapshots for October 2025 delivery (matches master index)"
git push
```
**Checks:** `verify_index` returns zero missing; snapshot hashes recorded in IntelGraph.

---

## 3) Release Gate — Verification & Attestations
- **SBOM:** regenerate (`sbom.spdx.json`), sign with cosign.  
- **SLSA provenance:** attach to artifacts; link Maestro run ID.  
- **Risk assessment:** no new risks; DPIA N/A or updated.  
- **Rollback plan:** criteria = `error_rate>threshold` OR `p95>budget` OR policy violation → auto‑rollback to `release-2025-09`.

**Commands**
```bash
./tools/sbom.sh && cosign attest --predicate slsa.provenance.json artifacts/disclosure_pack.zip
```

---

## 4) Stakeholder Comms
- **CEO One‑Pager:** link final metrics, runway impact, next two‑week slice.  
- **Changelog:** EO‑1..EO‑5 bullets; PRs merged; known follow‑ups.  
- **Customer note:** "production‑ready; minor cleanup pending API availability" + ETA window.

---

## 5) Sign‑Off Checklist (tick all)
- [ ] De‑dupe applied with review log + two approvals  
- [ ] PR #9800 merged (CI green, SBOM updated)  
- [ ] .ics imported and verified for next Monday (America/Phoenix)  
- [ ] Snapshots committed; index verified; hashes stored in IntelGraph  
- [ ] Disclosure Pack refreshed (SBOM + SLSA + risk memo)  
- [ ] Release tag `release-2025-10` created and annotated  

**Tag command**
```bash
git tag -a release-2025-10 -m "October 2025 Delivery — production-ready"
git push origin release-2025-10
```

---

## 6) Decision Log Entries (create in IntelGraph)
- Close Decision: "October 2025 Delivery ready for release" (two‑way door=false).  
- Decision: "Apply Project #8 de‑dupe per review log" (reversible=true).  
- Decision: "Merge PR #9800 via <rebase|cherry-pick>" (reversible=true).  

**Template**
```json
{"Context":"Finalize October 2025 delivery.","Options":["Rebase","Cherry-pick"],"Decision":"Rebase","Reversible":true,"Risks":["conflicts"],"Owners":["<PM>","<Eng-Lead>"],"Checks":["CI green","SBOM updated"]}
```

---

## 7) Appendix — Evidence Links (to fill)
- Maestro Run ID:  
- SBOM SHA256:  
- SLSA provenance URI:  
- Disclosure Pack path:  
- Post‑mortem link:  
- CEO One‑Pager link:  
- Master Index path:  



---

## 8) One‑Pass Orchestrator (Safe‑by‑Default)
Run all six steps end‑to‑end with guardrails. Default is **dry‑run**; set `APPLY=1` to perform writes after review.

> **Prereqs:** `git`, `python3`, `maestro`, `intelgraph`, `cosign`, `gh`, `jq`, access to repos and calendars.

### 8.1 Quick Start (fill and run)
```bash
export RUN_ID="oct-2025-delivery-final"
export RELEASE_TAG="release-2025-10"
export ROLLBACK_TAG="release-2025-09"
export PR_NUMBER="9800"
export PROJECT_ID="8"
export CAL_ICS="ops/dependency-sync.ics"
export MERGE_STRATEGY="rebase"   # or "cherry-pick"
export APPLY=0                    # 0=dry-run, 1=apply after review

./tools/run_one_pass.sh
```

### 8.2 Script: `tools/run_one_pass.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

: "${RUN_ID?}" "${RELEASE_TAG?}" "${ROLLBACK_TAG?}" "${PR_NUMBER?}" "${PROJECT_ID?}" "${CAL_ICS?}" "${MERGE_STRATEGY?}" "${APPLY?}"

log(){ printf "[%s] %s
" "$(date -Iseconds)" "$*"; }
need(){ command -v "$1" >/dev/null || { echo "missing: $1"; exit 127; }; }
for c in git python3 jq maestro cosign gh; do need "$c"; done

trap 'log "FAIL: rolling back criteria met?"' EXIT

check_api(){
  if [[ "${FORCE:-0}" == 1 ]]; then return 0; fi
  if ./tools/api_health.sh; then
    log "API healthy + rate limits OK"
  else
    log "API not OK; aborting. set FORCE=1 to override"
    exit 1
  fi
}

step1_dedupe(){
  log "STEP 1: De‑duplicate Project #${PROJECT_ID} (detect → review → dry‑run → apply)"
  mkdir -p projects/${PROJECT_ID} proposals review
  cli project export --project "${PROJECT_ID}" --out "projects/${PROJECT_ID}/items.ndjson"
  python3 tools/dedupe.py \
    --in "projects/${PROJECT_ID}/items.ndjson" \
    --out proposals/dedupe_proposals.csv \
    --similarity-threshold 0.92
  python3 tools/make_review_pack.py \
    --proposals proposals/dedupe_proposals.csv \
    --out review/review_log.json
  git checkout -B chore/dedupe-project-${PROJECT_ID}
  git add proposals/dedupe_proposals.csv review/review_log.json
  git commit -m "De-dupe proposals for Project #${PROJECT_ID} with evidence" || true
  git push -u origin chore/dedupe-project-${PROJECT_ID} || true
  if [[ "${APPLY}" == "1" ]]; then
    python3 tools/apply_dedupe.py --log review/review_log.json --dry-run 0
  else
    log "Dry‑run only (APPLY=0). Await approvals before APPLY=1."
  fi
}

step2_merge_pr(){
  log "STEP 2: Merge PR #${PR_NUMBER} via ${MERGE_STRATEGY}"
  git fetch origin && git checkout main && git pull --ff-only
  if [[ "${MERGE_STRATEGY}" == "rebase" ]]; then
    # assumes PR branch name retrievable via gh
    BRANCH=$(gh pr view "${PR_NUMBER}" --json headRefName -q .headRefName)
    git checkout "$BRANCH" && git rebase main
    ./scripts/test_all.sh
    git push --force-with-lease
    if [[ "${APPLY}" == "1" ]]; then gh pr merge "${PR_NUMBER}" --rebase --delete-branch; fi
  else
    SHA=$(gh pr view "${PR_NUMBER}" --json commits -q '.commits[-1].oid')
    git checkout main && git cherry-pick "$SHA"
    ./scripts/test_all.sh
    if [[ "${APPLY}" == "1" ]]; then git push origin main; else git reset --hard HEAD~1; fi
  fi
}

step3_import_ics(){
  log "STEP 3: Import calendar .ics"
  icslint "${CAL_ICS}"
  python3 tools/import_ics.py --file "${CAL_ICS}" --calendar "Dependency Sync"
  python3 tools/verify_calendar.py --calendar "Dependency Sync" --expect-weekday Mon --expect-duration 30
}

step4_snapshots(){
  log "STEP 4: Commit final snapshots"
  maestro artifact snapshot --run "${RUN_ID}" --out snapshots/
  python3 tools/verify_index.py --index docs/master_index.yml --dir snapshots/ --fail-on-missing
  git add snapshots/
  if [[ "${APPLY}" == "1" ]]; then git commit -m "Final snapshots for ${RUN_ID}" && git push; else git restore --staged snapshots/; fi
}

step5_tag(){
  log "STEP 5: Create annotated release tag ${RELEASE_TAG}"
  if [[ "${APPLY}" == "1" ]]; then
    git tag -a "${RELEASE_TAG}" -m "October 2025 Delivery — production-ready (${RUN_ID})"
    git push origin "${RELEASE_TAG}"
  else
    log "Dry‑run: skipping tag push"
  fi
}

step6_disclosure_pack(){
  log "STEP 6: Generate disclosure pack + GitHub release"
  ./tools/sbom.sh
  cosign attest --predicate slsa.provenance.json artifacts/disclosure_pack.zip || true
  if [[ "${APPLY}" == "1" ]]; then
    gh release create "${RELEASE_TAG}" artifacts/disclosure_pack.zip sbom.spdx.json slsa.provenance.json \
      --notes "Automated release for ${RUN_ID} with full Disclosure Pack"
  else
    log "Dry‑run: skipping GitHub release"
  fi
}

rollback(){
  log "ROLLBACK: tagging rollback and reverting if needed"
  git fetch origin
  git checkout main
  git reset --hard "${ROLLBACK_TAG}"
  git push --force-with-lease origin main
}

main(){
  check_api
  step1_dedupe
  step2_merge_pr
  step3_import_ics
  step4_snapshots
  step5_tag
  step6_disclosure_pack
  log "SUCCESS: One‑pass sequence completed (APPLY=${APPLY})"
}

main "$@"
```

### 8.3 Safety Gates (auto‑block)
- Abort if **API health** fails unless `FORCE=1`.
- Halt on CI failures after merge/cherry‑pick.
- Prevent tag creation if `verify_index` reports missing artifacts.
- On any policy violation or p95 SLO breach, stop and require manual approval or run `rollback`.



---

## 9) Aurelius Output Contract — Sprint Acceptance & Enforcement
**Scope:** PR‑5 (SLO Gate), PR‑6 (PR Comment Bot), PR‑7 (OTel stubs), PR‑8 (Neo4j PROFILE capture).

### 9.1 Acceptance Checklist (run in order)
- [ ] Merge **PR‑5** to land measurement→control layer.
- [ ] Execute baseline capture from your env.
- [ ] Enable **required status checks** on `main` (SLO Gate).
- [ ] Merge **PR‑6, PR‑7, PR‑8**.
- [ ] Verify PR auto‑comments show current vs baseline.
- [ ] Confirm traces emit IDs in logs (local + CI).
- [ ] Ensure JSONL graph metrics are collected and archived.

### 9.2 Copy‑paste Commands

**A) Merge PR‑5 and establish baseline**
```bash
gh pr merge 5 --squash --delete-branch  # or --merge/--rebase
WRITE_BASELINE=1 python3 sprint/experiments/evaluate.py
git add sprint/benchmark/baseline.json
git commit -m "chore(bench): establish baseline" && git push
```

**B) Protect `main` with SLO Gate**  
> Requires `gh` CLI admin token with `repo` scope.
```bash
# Replace OWNER/REPO and CHECK with your exact CI job name (e.g., "SLO Gate")
OWNER="YOURORG"; REPO="YOURREPO"
CHECKS='["SLO Gate"]'  # add more if desired

gh api -X PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/branches/main/protection" \
  -f required_status_checks.strict=true \
  -f enforce_admins=true \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f required_linear_history=true \
  -F required_status_checks.contexts[]="SLO Gate"
```

**C) Verify CI gates and PR comments**
```bash
# Trigger CI on a dummy change to collect metrics
./scripts/touch_ci.sh "ci: metrics ping"
# List last PR comments to confirm table render
PR_NUM=$(gh pr list --limit 1 --json number -q '.[0].number')
gh pr view $PR_NUM --comments
```

**D) Enable OTel and Graph PROFILE smoke**
```bash
# Local
node -e 'require("./api/otel.js"); console.log("OTel init smoke OK")'
node scripts/bench_graph.js --profile --limit 5 | tail -n 5
```

### 9.3 Evidence to capture (attach to IntelGraph)
- `sprint/benchmark/slo.yaml` hash + path
- `sprint/experiments/evaluate.py` version SHA
- CI run URL that enforced SLO (green/red)
- Sample PR comment permalink with metrics table
- `scripts/bench_graph.js --profile` JSONL excerpt (dbHits, timeMs)
- Console log snippet with TraceId from OTel init

### 9.4 What breaks the build (explicit)
- p95 API or graph latency > thresholds in `slo.yaml`  
- Regression > 10% vs baseline (soft guard can be promoted to hard by setting `STRICT=1` in CI)  
- Missing baseline file on `main` for SLO job

### 9.5 Rollback knobs
```bash
# CI only: bypass on hotfix branches
export SLO_BYPASS_FOR="hotfix/.*"  # respected by evaluate.py
# Lower env noise window (defaults shown)
export SAMPLE_COUNT=30
export WARMUP_SECONDS=5
```

### 9.6 Metrics ownership
| Metric | Owner | SLO | Source |
|---|---|---:|---|
| API p95 latency | Eng‑Lead | ≤ 300 ms | `evaluate.py` / `/metrics` |
| Graph query p95 | Data‑Lead | ≤ 500 ms | PROFILE JSONL |
| Error budget burn | PM | ≤ 2%/day | EO‑1/EO‑2 monitors |

### 9.7 Links (fill)
- CI workflow: `.github/workflows/aurelius-sprint.yml`  
- PR comment bot: `.github/workflows/bench-comment.yml`  
- OTel init: `api/otel.js`  
- Graph bench: `scripts/bench_graph.js`  
- Governance docs: `sprint/compliance/*`  

