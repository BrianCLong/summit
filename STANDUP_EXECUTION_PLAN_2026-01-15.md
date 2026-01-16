# Summit Daily Standup Execution Plan
## Thursday, January 15, 2026 (America/Denver)

**Orchestrator:** Claude Code
**Release Captain:** Brian
**Session ID:** `lft1I`
**Branch:** `claude/summit-standup-orchestrator-lft1I`

---

## Owners and merge priority

### Workstream Assignments

**A — GA Release Green Path**
- **Owners:** Atlas + Brian
- **Mission:** Produce mechanically verifiable GA release candidate with complete proof bundle
- **Critical path:** Release scripts validation → Evidence bundle generation → Tag cut

**B — Cloud Dev/Stage/Prod**
- **Owners:** Claude Code + Brian
- **Mission:** Live environments with golden deployment path and rollback capability
- **Critical path:** Dev deployment → Smoke tests → Stage promotion → Prod gating

**C — Security + Supply Chain**
- **Owners:** Antigravity + Jules
- **Status:** ✅ **MAJOR PROGRESS ALREADY ACHIEVED**
- **Merged today:**
  - PR #16318: Security sprint (scanner consolidation, eval→vm RCE fix)
  - PR #16287: Python RCE batch patches (tar extraction hardening)
  - Commit 7e6c6c25: CI security trust separation
  - Commit 978670a6: Migration script sandboxing + security policies
- **Remaining:** Scanner threshold tuning, suppression documentation

**D — CI Determinism + Proof Capture**
- **Owners:** Qwen + Codex + Atlas
- **Mission:** Deterministic outputs, stable artifact paths, mechanically verifiable evidence
- **Critical path:** Stamp.json atomic writes → Evidence ID consistency → Replay validation

### Merge Priority (Conflict Resolution)

**Default sequence:** `C + D → A → B`

**Rationale:**
- **C (Security)** already substantially merged; remaining work is non-breaking tuning
- **D (Determinism)** must land before GA cut to ensure proof bundle stability
- **A (GA Release)** depends on D's evidence infrastructure being deterministic
- **B (Cloud Deploy)** promotes artifacts from A; can proceed in parallel once A artifacts exist

**Sequencing constraints:**
- D's atomic stamp writing (`ead28037`) must be validated before A's GA bundle generation
- C's scanner config should be merge-blocking threshold-ready before A's release verification
- B can start dev/stage work immediately; prod promotion waits for A's signed artifacts

---

## Hour-by-hour plan (today)

### Time Bucket 1: Now → +1 hour (Validation & Setup)

**Workstream C (Security) — Antigravity + Jules:**
- ✅ **ALREADY COMPLETE:** Core RCE patches merged, CI trust boundary implemented
- **Action:** Define merge-blocking scanner policy (critical/high only vs. track-as-issues for medium/low)
- **Artifact:** `SECURITY/.scanners/blocking-policy.json` (NOT EXECUTED)
- **Command:** `NOT EXECUTED - node scripts/security/define-blocking-thresholds.mjs --output SECURITY/.scanners/blocking-policy.json`

**Workstream D (Determinism) — Qwen + Codex:**
- **Action:** Validate atomic stamp writing produces stable artifacts across runs
- **Artifact:** Two consecutive CI runs with identical `dist/evidence/${COMMIT_SHA}/stamp.json` content (timestamp fields excluded)
- **Command (NOT EXECUTED):**
  ```bash
  git rev-parse HEAD > /tmp/test-sha.txt
  pnpm ga:verify 2>&1 | tee /tmp/run1.log
  EVIDENCE_SHA=$(cat /tmp/test-sha.txt)
  cp "dist/evidence/${EVIDENCE_SHA}/stamp.json" /tmp/stamp1.json
  # Clean and re-run
  rm -rf dist/evidence
  pnpm ga:verify 2>&1 | tee /tmp/run2.log
  cp "dist/evidence/${EVIDENCE_SHA}/stamp.json" /tmp/stamp2.json
  # Compare (ignoring timestamp field)
  diff <(jq 'del(.timestamp)' /tmp/stamp1.json) <(jq 'del(.timestamp)' /tmp/stamp2.json)
  ```

**Workstream A (GA Release) — Atlas:**
- **Action:** Review release scripts inventory and confirm GA verification command sequence
- **Artifact:** Checklist of required gates from `scripts/release/` (NOT EXECUTED)
- **Command:** `NOT EXECUTED - ls -1 scripts/release/*verify* scripts/release/*ga* | tee /tmp/ga-gates.txt`

**Workstream B (Cloud Deploy) — Claude Code:**
- **Action:** Inspect existing deploy infrastructure and document current state
- **Artifact:** Dev/stage/prod deployment readiness assessment
- **Command (NOT EXECUTED):**
  ```bash
  cat scripts/deploy.sh
  ls -la scripts/multi-cluster/
  # Document: what exists, what needs creation, what's blocked
  ```

### Time Bucket 2: +1 → +3 hours (Core Execution)

**Workstream D (Determinism) — Qwen + Codex + Atlas:**
- **Action:** Run evidence ID consistency verification across all governance docs
- **Command (NOT EXECUTED):** `pnpm ci:evidence-id-consistency`
- **Expected artifact:** `dist/evidence/id-consistency-report.json` with zero drift warnings
- **Risk:** If drift detected, requires immediate remediation before GA cut

**Workstream C (Security) — Antigravity:**
- **Action:** Generate security evidence pack in live mode
- **Command (NOT EXECUTED):** `pnpm security:evidence-pack`
- **Expected artifact:** `dist/security-evidence-pack.json` with all scanners passing at blocking thresholds
- **Fallback:** If blockers exist, document exceptions with justification in `SECURITY/.scanners/exceptions.md`

**Workstream A (GA Release) — Atlas + Brian:**
- **Action:** Execute GA verification runner (full gate suite)
- **Command (NOT EXECUTED):** `pnpm ga:verify`
- **Expected artifacts:**
  - `dist/evidence/${COMMIT_SHA}/stamp.json` (environment + versions + git SHA + pass/fail)
  - `dist/evidence/${COMMIT_SHA}/report.json` (deterministic test/lint outputs)
  - CI run links captured in stamp.json
- **Gate criteria:** All tests pass, typecheck clean, no critical security findings

**Workstream B (Cloud Deploy) — Claude Code + Brian:**
- **Action:** Stand up dev environment with health checks
- **Command (NOT EXECUTED):**
  ```bash
  # Build immutable artifact
  docker compose -f docker-compose.dev.yaml build
  COMMIT_SHA=$(git rev-parse HEAD)
  docker tag intelgraph-platform:latest intelgraph-platform:${COMMIT_SHA}

  # Deploy to dev
  docker compose -f docker-compose.dev.yaml up -d

  # Smoke test
  curl -sSf http://localhost:3000 > /dev/null
  curl -sSf http://localhost:8080/health | jq .
  ```
- **Expected artifact:** Dev environment responding with healthy status

### Time Bucket 3: +3 hours → End of Day (Integration & Handoff)

**Workstream A (GA Release) — Atlas + Brian:**
- **Action:** Generate release bundle with SBOM and provenance manifest
- **Command (NOT EXECUTED):**
  ```bash
  pnpm release:bundle --sha $(git rev-parse HEAD)
  pnpm generate:sbom
  pnpm generate:provenance
  ```
- **Expected artifacts:**
  - `dist/release/bundle-${VERSION}.tar.gz`
  - `dist/release/sbom.json` (dependency inventory)
  - `dist/release/provenance.json` (build attestation)

**Workstream B (Cloud Deploy) — Claude Code:**
- **Action:** Promote dev artifact to stage, validate, document rollback
- **Command (NOT EXECUTED):**
  ```bash
  # Promote same image to stage
  COMMIT_SHA=$(git rev-parse HEAD)
  docker tag intelgraph-platform:${COMMIT_SHA} intelgraph-platform:stage-${COMMIT_SHA}

  # Deploy stage (assume stage compose file or k8s manifest)
  # docker compose -f docker-compose.stage.yaml up -d

  # Smoke test stage
  # curl -sSf https://stage.intelgraph.example/health

  # Document rollback
  echo "Rollback: docker tag intelgraph-platform:stage-previous intelgraph-platform:stage-current && redeploy" > RUNBOOKS/rollback-stage.md
  ```

**Workstream D (Determinism) — Atlas:**
- **Action:** Validate proof capture bundle completeness
- **Command (NOT EXECUTED):**
  ```bash
  node scripts/release/verify-release-bundle.mjs --strict
  # Confirm bundle contains:
  # - stamp.json, report.json, sbom.json, provenance.json
  # - All file hashes match, no missing required artifacts
  ```

**All Workstreams — Handoff:**
- **Action:** Update this plan with actual execution results and blockers
- **Artifact:** Annotated copy of this document with ✅/❌/⚠️ status markers and next actions
- **Owner:** Brian to review and commit final status before EOD

---

## Merge train snapshot

| PR/Commit | Owner | Required Gates | Risk | Status |
|-----------|-------|----------------|------|--------|
| ✅ #16318 (Security sprint) | Antigravity/Jules | Snyk, Gitleaks, CodeQL | **LOW** (merged) | ✅ **MERGED** (commit 0fcf09d3) |
| ✅ #16287 (Python RCE batch) | Antigravity | Pytest, security audit | **LOW** (merged) | ✅ **MERGED** (commit 144b330f) |
| ✅ Atomic stamp writing | Qwen | Jest, schema validation | **MEDIUM** (merged) | ✅ **MERGED** (commit ead28037) |
| ✅ CI trust separation | Jules | Workflow linting, permissions check | **LOW** (merged) | ✅ **MERGED** (commit 7e6c6c25) |
| 🟡 Scanner blocking policy | Antigravity | Policy schema validation | **LOW** | 🟡 **PENDING** (0–1hr) |
| 🟡 Evidence ID consistency check | Qwen/Atlas | ID drift report = zero warnings | **MEDIUM** | 🟡 **PENDING** (1–3hr) |
| 🟡 GA verification run | Atlas/Brian | All tests pass, stamp.json valid | **HIGH** | 🟡 **PENDING** (1–3hr) |
| 🟡 Security evidence pack | Antigravity | No critical/high findings | **MEDIUM** | 🟡 **PENDING** (1–3hr) |
| 🟡 Dev environment live | Claude Code | Health checks green | **LOW** | 🟡 **PENDING** (1–3hr) |
| 🔵 Release bundle generation | Atlas | Bundle schemas valid, SBOM complete | **HIGH** | 🔵 **QUEUED** (3hr+) |
| 🔵 Stage promotion | Claude Code | Stage smoke tests pass | **MEDIUM** | 🔵 **QUEUED** (3hr+) |
| 🔵 Proof bundle validation | Atlas | Verify-release-bundle strict mode | **HIGH** | 🔵 **QUEUED** (3hr+) |

**Legend:**
- ✅ Merged/Complete
- 🟡 In-progress or active this bucket
- 🔵 Queued for later bucket
- ❌ Blocked

**Merge order rationale:**
Security foundations (C) → Determinism infrastructure (D) → GA release mechanics (A) → Cloud deployment (B)

---

## Evidence and runbook hooks

### Canonical Commands (GA Verification)

**Full GA verification suite:**
```bash
# NOT EXECUTED
pnpm ga:verify
```
**Expected artifacts:**
- `dist/evidence/${COMMIT_SHA}/stamp.json` (JSON: environment, versions, git SHA, pass/fail, CI links)
- `dist/evidence/${COMMIT_SHA}/report.json` (JSON: deterministic test/lint outputs)
- Exit code 0 = all gates passed

**Server-specific GA verification:**
```bash
# NOT EXECUTED
pnpm ga:verify:server
```
**Expected artifacts:**
- TypeScript compilation clean
- Server build artifacts in `server/dist/`
- Unit test results with coverage
- Exit code 0 = server ready for release

**Security evidence pack:**
```bash
# NOT EXECUTED
pnpm security:evidence-pack
```
**Expected artifact:**
- `dist/security-evidence-pack.json` (JSON: scanner findings aggregated, blocking policy applied)

### Canonical Commands (Cloud Deployment)

**Dev environment:**
```bash
# NOT EXECUTED
# Build artifact
docker compose -f docker-compose.dev.yaml build
COMMIT_SHA=$(git rev-parse HEAD)
docker tag intelgraph-platform:latest intelgraph-platform:${COMMIT_SHA}

# Deploy
docker compose -f docker-compose.dev.yaml up -d

# Smoke test
curl -sSf http://localhost:3000 > /dev/null && echo "UI OK"
curl -sSf http://localhost:8080/health | jq . && echo "Gateway OK"
```
**Expected logs/artifacts:**
- Docker Compose logs showing all services healthy
- Health endpoint JSON response with `status: "ok"`

**Stage promotion (same artifact):**
```bash
# NOT EXECUTED
COMMIT_SHA=$(git rev-parse HEAD)
# Tag for stage
docker tag intelgraph-platform:${COMMIT_SHA} intelgraph-platform:stage-${COMMIT_SHA}
# Deploy to stage (command depends on infra: k8s, compose, cloud provider)
# Example: docker compose -f docker-compose.stage.yaml up -d
# Smoke test stage endpoint
```

**Prod promotion (gated, immutable artifact):**
```bash
# NOT EXECUTED
# Requires: A's signed release bundle + manual approval gate
# Tag for prod
docker tag intelgraph-platform:${COMMIT_SHA} intelgraph-platform:prod-${COMMIT_SHA}
# Deploy via CD pipeline or manual:
# kubectl set image deployment/intelgraph intelgraph=intelgraph-platform:prod-${COMMIT_SHA}
```

**Rollback playbook:**
```bash
# NOT EXECUTED
# Identify previous good SHA
PREVIOUS_SHA="<commit-sha-from-last-good-deploy>"
# Re-tag and redeploy
docker tag intelgraph-platform:${PREVIOUS_SHA} intelgraph-platform:prod-rollback
# Redeploy same command as promotion, using rollback tag
# Validate health checks
```

### Evidence Artifacts (Must-Exist After Today)

| Artifact Path | Content Type | Owner | Purpose |
|---------------|--------------|-------|---------|
| `dist/evidence/${COMMIT_SHA}/stamp.json` | JSON | Atlas/Qwen | Environment snapshot + gate pass/fail + CI links |
| `dist/evidence/${COMMIT_SHA}/report.json` | JSON | Atlas | Deterministic test/lint outputs |
| `dist/security-evidence-pack.json` | JSON | Antigravity | Aggregated scanner findings + blocking policy |
| `dist/evidence/id-consistency-report.json` | JSON | Qwen | Evidence ID drift detection across governance docs |
| `dist/release/bundle-${VERSION}.tar.gz` | Tarball | Atlas | Complete release bundle (code + artifacts) |
| `dist/release/sbom.json` | JSON (CycloneDX or SPDX) | Atlas | Software Bill of Materials |
| `dist/release/provenance.json` | JSON (SLSA or in-toto) | Atlas | Build provenance attestation |
| `RUNBOOKS/rollback-stage.md` | Markdown | Claude Code | Stage rollback procedure |
| `RUNBOOKS/rollback-prod.md` | Markdown | Claude Code | Prod rollback procedure (approval-gated) |
| `SECURITY/.scanners/blocking-policy.json` | JSON | Antigravity | Scanner threshold configuration (critical/high blocking) |

**Attachment strategy:**
All artifacts committed to repo under `dist/` (gitignored in normal dev, committed in release branches) OR uploaded to CI artifact storage with permanent links captured in `stamp.json`.

---

## 4-hour cutline

**Assumption:** Only ~4 focused hours remain today.

### Must-Complete Items (Priority Order)

1. **[D] Evidence ID consistency verification** (Qwen + Atlas)
   - **Why:** Blocks GA release if drift exists; must be deterministic before cutting release
   - **Action:** `pnpm ci:evidence-id-consistency` → remediate any drift → validate clean
   - **Success criteria:** Zero warnings in drift report

2. **[C] Security scanner blocking policy** (Antigravity)
   - **Why:** Establishes merge-blocking criteria for ongoing PRs and future releases
   - **Action:** Define thresholds (critical/high block, medium/low track), document suppressions
   - **Success criteria:** `SECURITY/.scanners/blocking-policy.json` committed, policy schema valid

3. **[A] GA verification run (full suite)** (Atlas + Brian)
   - **Why:** Core deliverable; produces mechanically verifiable release candidate proof
   - **Action:** `pnpm ga:verify` → capture stamp.json + report.json → commit evidence bundle
   - **Success criteria:** All tests pass, artifacts deterministic, CI links captured

4. **[A] Release bundle generation** (Atlas)
   - **Why:** Produces shippable artifact with SBOM/provenance for auditable GA path
   - **Action:** `pnpm release:bundle && pnpm generate:sbom && pnpm generate:provenance`
   - **Success criteria:** Bundle validates with `pnpm release:verify`, schemas pass strict mode

5. **[B] Dev environment live + smoke tests** (Claude Code)
   - **Why:** Demonstrates cloud deployment capability; dev is prerequisite for stage/prod
   - **Action:** Build artifact, deploy via docker-compose, validate health endpoints
   - **Success criteria:** UI + Gateway health checks green, artifact tagged with commit SHA

### Nice-to-Have (If Time Permits)

- **[B] Stage promotion:** Promote dev artifact to stage, run smoke tests, document rollback
- **[D] Proof bundle validation:** Run strict verify-release-bundle check on A's output
- **[C] Security evidence pack generation:** Full live scanner run with blocking policy applied

### Explicitly Deferred (Next Day/Session)

- **[B] Prod deployment:** Requires manual approval gates, not in 4-hour scope
- **[A] Public release tagging/notes:** GA bundle must be validated in stage first
- **[D] Replay-only mode enforcement in CI:** Nice-to-have determinism hardening, not blocking

### Cutline Rationale

This 4-hour plan prioritizes **a credible GA release candidate pathway** (items 1, 3, 4) while ensuring **no new nondeterminism or security risk** is introduced (items 1, 2). Dev cloud deployment (item 5) demonstrates the golden path without requiring stage/prod promotion today. The plan **preserves a green mainline** by sequencing D → C → A → B, ensuring determinism and security gates are stable before cutting the GA bundle.

---

## Next Actions (Brian)

1. **Assign explicit owners** to time buckets if different from workstream defaults
2. **Set merge priority override** if C+D→A→B sequence needs adjustment
3. **Approve 4-hour cutline** or revise scope based on actual available hours
4. **Trigger first commands** from Time Bucket 1 (validation & setup) to start the clock
5. **Monitor for blockers** and escalate immediately if evidence ID drift or security findings block GA verification

**Execution note:**
All commands above are marked `NOT EXECUTED` and represent the canonical paths. Actual execution should be done by assigned agents/owners, with results logged back into this document or a companion execution log. At EOD, annotate each workstream section with ✅ (complete), ⚠️ (partial/blocked), or ❌ (failed) and capture any new blockers for tomorrow's standup.

---

**End of Standup Execution Plan**
*Generated: 2026-01-16 by Claude Code (Summit Standup Orchestrator)*
*Branch: `claude/summit-standup-orchestrator-lft1I`*
*Next update: EOD 2026-01-15 or on major blocker*
