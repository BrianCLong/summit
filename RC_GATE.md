# Summit Release Candidate Gate

**Version scope**: v4.6.0-rc.1 and forward
**Maintained by**: Release Engineering
**Status**: CANONICAL — this document is the authoritative RC readiness index

---

## What This Document Is

This is the single canonical surface for Summit release-candidate readiness.
It unifies merge readiness, deploy readiness, rollback readiness, post-deploy validation, telemetry readiness, and operational documentation into one coherent view.

A reviewer or operator answering any of the following questions should start here:

- What exactly constitutes RC readiness for Summit?
- What checks are canonical versus optional?
- What is the canonical deploy flow?
- What is the canonical rollback flow?
- What is the canonical post-deploy validation flow?
- What telemetry/health signals matter for launch?
- What documentation/runbook entrypoints are canonical?
- What evidence proves readiness?
- What blockers remain before GA?

---

## 1. RC Definition

Summit is **release-candidate ready** when all of the following gates pass:

| Gate | Category | Canonical Check |
|------|----------|----------------|
| Release Readiness CI | Merge readiness | `.github/workflows/release-readiness.yml` (green on `main`) |
| GA Readiness | Pre-release verification | `.github/workflows/_reusable-ga-readiness.yml` via `scripts/release/ga_verify.mjs` |
| Go-Live Gate | Deploy evidence | `.github/workflows/go-live-gate.yml` |
| Post-Deploy Validation | Operational | `scripts/validate-summit-deploy.mjs` (T+15m) |
| GA Regression Check | Post-deploy | `scripts/detect-ga-regressions.mjs` (T+1h) |
| Rollback Rehearsal | Operational readiness | `RUNBOOKS/GA_RELEASE.md` §Rollback, rehearsed |
| Governance Lockfile | Supply-chain | `scripts/release/verify_governance_lockfile.sh` |
| Operator Signoff | Go/No-Go | `GO_NO_GO_GATE.md` (all roles signed) |

**All eight gates must be GREEN or explicitly signed off before a GA tag is cut.**

---

## 2. Canonical RC Check Script

Run the local pre-flight check before any RC tag:

```bash
bash scripts/rc-check.sh
```

This script runs the subset of gates that can execute locally (without a live deployment) and reports readiness. It does not replace CI; it catches local issues early.

---

## 3. RC Lifecycle

### Step 1 — Pre-flight (local)

```bash
# Verify working tree is clean
git status

# Run local RC pre-flight
bash scripts/rc-check.sh

# Dry-run GA verification (no tag created)
node scripts/release/ga_verify.mjs --verbose
```

### Step 2 — RC Preparation (CI)

Trigger the RC Preparation workflow:

```
.github/workflows/rc-preparation.yml
  → inputs: base_version, commit_sha, dry_run=true
```

Download the RC Preparation Bundle artifact, review `commands.sh`, then execute to create the RC tag.

### Step 3 — RC Tag Creation

```bash
# Create the annotated RC tag (use ga-tag.ts for validation)
npx ts-node scripts/release/ga-tag.ts --version <X.Y.Z> --pre-release rc.1

# Push the tag
git push origin ga/vX.Y.Z-rc.1
```

### Step 4 — Release-GA Workflow

The `release-ga.yml` workflow triggers automatically on the tag push.
Monitor CI for: build, verify, SBOM, signing steps.

### Step 5 — Deploy

Follow `RUNBOOKS/GA_RELEASE.md` for the full deploy sequence.

### Step 6 — Post-Deploy Validation

At T+15m:
```bash
node scripts/validate-summit-deploy.mjs --env production --url https://api.summit.example.com
```

At T+1h:
```bash
node scripts/detect-ga-regressions.mjs
```

### Step 7 — Go/No-Go Decision

All roles listed in `GO_NO_GO_GATE.md` must sign before full traffic is enabled.

---

## 4. Canonical Deploy Flow

**Authoritative runbook**: `RUNBOOKS/GA_RELEASE.md`

Summary:
1. Tag via `scripts/release/ga-tag.ts`
2. CI: `release-ga.yml` builds and signs artifacts
3. Deploy: Helm upgrade or equivalent per `RUNBOOKS/GA_RELEASE.md §Deploy`
4. Verify: `scripts/validate-summit-deploy.mjs`
5. Monitor: First-week cadence per `RUNBOOKS/GA_FIRST_WEEK_OPERATIONS.md`

---

## 5. Canonical Rollback Flow

**Authoritative runbook**: `docs/runbooks/rollback-procedure.md`

Quick reference:
```bash
# Helm rollback
helm rollback <release> <previous-revision> -n <namespace>

# Verify rollback health
node scripts/validate-summit-deploy.mjs

# File incident ticket and attach Grafana snapshots
```

**Rollback triggers**:
- Error rate > 1% sustained for 5 minutes
- SLO burn rate > 2× over budget for 10 minutes
- Any Cosign verification failure post-deploy
- Any data integrity or audit ledger anomaly

---

## 6. Canonical Post-Deploy Validation Flow

**Authoritative script**: `scripts/validate-summit-deploy.mjs`
**Authoritative runbook**: `RUNBOOKS/GA_FIRST_WEEK_OPERATIONS.md`

| Time | Action | Success Criteria |
|------|--------|-----------------|
| T+15m | `node scripts/validate-summit-deploy.mjs` | All services GREEN |
| T+1h | `node scripts/detect-ga-regressions.mjs` | No regressions detected |
| T+4h | Synthetic traffic + queue review | Error budget < 2% consumed |
| T+12h | Evidence integrity audit | All ledger entries signed |
| Daily | Morning triage | P2+ issues reviewed |
| T+7d | Stabilization signoff | Golden Main frozen; release declared Mature |

---

## 7. Telemetry and Health Signals

**Dashboard entrypoints** (see `RUNBOOKS/GA_FIRST_WEEK_OPERATIONS.md §Critical Signals`):

| Signal | Threshold | Dashboard |
|--------|-----------|-----------|
| Service error rate | > 1% over 5m | Production SLO Dashboard |
| Ingest queue depth | > 5,000 | Maestro Production Dashboard |
| Evidence lag | > 15 minutes | Maestro Production Dashboard |
| P95 query latency | > 1,500ms | Collab Latency Dashboard |
| LLM token cost | > $500/day | FinOps Dashboard |

**Rollback triggers** from `docs/runbooks/rollback-procedure.md`:
- Production error rate > 1% for 5m → rollback
- SLO burn rate > 2× budget for 10m → rollback
- Policy breach in Gatekeeper → immediate rollback

---

## 8. Canonical Documentation Index

| Purpose | Document |
|---------|----------|
| **RC Gate (this doc)** | `RC_GATE.md` |
| **Launch checklist** | `LAUNCH_CHECKLIST.md` |
| **Go/No-Go signoff** | `GO_NO_GO_GATE.md` |
| **GA deploy runbook** | `RUNBOOKS/GA_RELEASE.md` |
| **First-week operations** | `RUNBOOKS/GA_FIRST_WEEK_OPERATIONS.md` |
| **Disaster recovery** | `RUNBOOKS/DISASTER_RECOVERY.md` |
| **Rollback procedure** | `docs/runbooks/rollback-procedure.md` |
| **Launch operations** | `docs/runbooks/LAUNCH_RUNBOOKS.md` |
| **GA cut checklist** | `docs/runbooks/ga-cut-checklist.md` |
| **Operator escalation matrix** | `docs/runbooks/GA_ESCALATION_MATRIX.md` |
| **RC readiness report** | `RC_READINESS_REPORT.md` |

---

## 9. Evidence That Proves Readiness

The following artifacts constitute the RC evidence bundle:

| Artifact | Source | Notes |
|---------|--------|-------|
| `artifacts/ga-verify/ga_verify_report.md` | `scripts/release/ga_verify.mjs` | Must show PASS on all checks |
| `RC_READINESS_REPORT.md` | `scripts/rc-check.sh` | Deterministic gate summary |
| Go-Live Gate evidence bundle | `go-live-gate.yml` workflow artifact | Attached to CI run |
| Post-deploy validation report | `scripts/validate-summit-deploy.mjs` | Run at T+15m |
| SBOM (CycloneDX + SPDX) | `release-ga.yml` | Attached to GitHub Release |
| SLSA Build Provenance | `release-ga.yml` | Attached to GitHub Release |
| Cosign signature | `release-ga.yml` | Published to Sigstore |
| `GO_NO_GO_GATE.md` (signed) | Human reviewer | All roles signed |

---

## 10. Remaining Blockers Before GA

The following items were identified in `FINAL_READINESS_REPORT.md` as GA-blocking.
Each must be resolved (or formally deferred with documented risk acceptance) before GA tag:

| # | Blocker | Severity | Owner |
|---|---------|----------|-------|
| B-1 | Audit logging must be made persistent (currently console-only) | Critical | Backend |
| B-2 | Test infrastructure repair (187 test patterns disabled) | Critical | QA |
| B-3 | Tenant isolation tests must be real (currently mocked) | Critical | Backend |
| B-4 | Security tests must be re-enabled | Critical | Security |
| B-5 | Gate services must be instantiated in production | Critical | Ops |

**Resolution requirement**: Each blocker must be either (a) fixed with evidence, or (b) explicitly accepted with a written risk owner and deferred to a named post-GA sprint, before the GA tag is cut.

---

## 11. What "Done" Means for RC

RC is **DONE** when:

- [ ] `bash scripts/rc-check.sh` returns GREEN on the release commit
- [ ] `node scripts/release/ga_verify.mjs` returns PASS on all checks
- [ ] `rc-preparation.yml` workflow artifact downloaded and reviewed
- [ ] RC tag pushed; `release-ga.yml` workflow GREEN
- [ ] `RC_READINESS_REPORT.md` generated and committed
- [ ] All blockers in §10 resolved or formally deferred
- [ ] `GO_NO_GO_GATE.md` signed by all required roles
- [ ] Post-deploy validation GREEN at T+15m and T+1h

---

## 12. Reviewer/Operator Quick Reference

| Question | Answer |
|----------|--------|
| Is the commit releasable? | Run `node scripts/release/ga_verify.mjs` |
| What is the deploy command? | See `RUNBOOKS/GA_RELEASE.md §Creating a GA Release` |
| What is the rollback command? | `helm rollback <release> <revision> -n <ns>` — see `docs/runbooks/rollback-procedure.md` |
| What do I watch post-deploy? | See `RUNBOOKS/GA_FIRST_WEEK_OPERATIONS.md §Critical Signals` |
| Where are the dashboards? | See §7 above |
| What evidence do reviewers need? | See §9 above |
| What blockers remain? | See §10 above |
| Who signs off? | See `GO_NO_GO_GATE.md` |
