# Deploy Readiness Report

**Schema version**: 1.0.0
**Scope**: Summit Platform — GA Deploy Path Audit

---

## Deploy Surface Inventory

| Surface | Location | Status |
|---------|----------|--------|
| Canonical GA pipeline | `.github/workflows/release-ga-pipeline.yml` | PRESENT |
| Emergency dispatch workflow | `.github/workflows/release-ga.yml` | PRESENT (dispatch-only) |
| Rollback workflow | `.github/workflows/release-rollback.yml` | PRESENT |
| Post-deploy gate | `.github/workflows/post-deploy-gate.yml` | PRESENT |
| Smoke gate | `.github/workflows/smoke-gate.yml` | PRESENT |
| Go-live readiness doc | `GO_LIVE_READINESS.md` | PRESENT |
| Operator launch checklist | `LAUNCH_OPERATOR_CHECKLIST.md` | PRESENT |
| Launch checklist | `LAUNCH_CHECKLIST.md` | PRESENT |
| Docker Compose prod | `deploy/docker-compose.prod.yml` | PRESENT |
| Helm chart | `deploy/helm/intelgraph/` | PRESENT |
| Production smoke script | `scripts/go-live/smoke-prod.sh` | PRESENT |
| Post-deploy canary | `scripts/go-live/post-deploy-canary.sh` | PRESENT |
| Preflight check | `scripts/release/preflight-check.ts` | PRESENT |
| Rollback script | `scripts/release/rollback_release.sh` | PRESENT |
| Freeze gate enforcement | `scripts/release/enforce_freeze_gate.sh` | PRESENT |
| RC lineage verifier | `scripts/release/verify-rc-lineage.sh` | PRESENT |
| Publish guard | `scripts/release/publish_guard.sh` | PRESENT |
| GA bundle builder | `scripts/release/build-ga-bundle.sh` | PRESENT |

---

## Canonical GA Deploy Flow

```
1. Create RC tag (e.g., v4.6.0-rc.1)
   → triggers CI, runs all checks

2. On RC passing, create GA tag (e.g., v4.6.0)
   → triggers release-ga-pipeline.yml

3. Pipeline stages:
   [Gate] → [Freeze Check] → [Lineage Check] → [Verification] → [Build Bundle]
   → [Publish Guard] → [Assemble] → [ga-release env approval] → [Publish]

4. Operator runs post-deploy validation:
   gh workflow run post-deploy-gate.yml \
     -f base_url=https://<your-domain>
```

**Environment gate**: `ga-release` (requires two-person approval before publish step)

---

## Gaps Resolved in This PR

| Gap | Fix |
|-----|-----|
| `release-ga.yml` triggered on push tags alongside `release-ga-pipeline.yml`, creating competing deployments | Restricted `release-ga.yml` to `workflow_dispatch` only |
| `rollback-plan.md` was a 2-line stub with no actionable content | Replaced with full operator rollback plan |
| `pnpm evidence:post-deploy:gen/verify` not defined | Scripts added to `package.json` |

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| `deploy/docker-compose.prod.yml` not validated in CI | MEDIUM | Helm path is tested; Compose prod is manual only |
| No preflight step in `release-ga-pipeline.yml` | LOW | Preflight script exists (`scripts/release/preflight-check.ts`) but not wired into pipeline |
| `pnpm skill vet` in pipeline requires `pnpm skill` binary | LOW | May fail in environments without full toolchain |
| Rollback workflow uses `hotfix-release` env for approval gate | INFO | Correct but operators must be configured as required reviewers in that environment |

---

## Determinism Note

This report reflects the state of the deploy surface as audited. It contains no timestamps.
Stamps belong in separate stamp files only.
