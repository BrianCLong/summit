# Summit Launch Checklist

**Canonical RC gate**: `RC_GATE.md`
**Go/No-Go signoff**: `GO_NO_GO_GATE.md`
**RC readiness report**: `RC_READINESS_REPORT.md`

---

## Phase 1 — Pre-Tag Gates (all must be PASS)

- [ ] **RC Pre-Flight**: `bash scripts/rc-check.sh` returns PASS
- [ ] **GA Verify**: `node scripts/release/ga_verify.mjs` returns PASS on all checks
- [ ] **Code Freeze Enforced**: `LAUNCH_SCOPE.md` active, CI checks passing on main
- [ ] **Claims Verified**: `scripts/verify_claims.cjs` returns PASS
- [ ] **Security Scan**: Latest scan clean (Critical/High zero); see `docs/runbooks/ga-cut-checklist.md`
- [ ] **SBOM Generated**: CycloneDX + SPDX attached; CVE scan at or below threshold
- [ ] **Governance Lockfile**: `bash scripts/release/verify_governance_lockfile.sh` returns PASS
- [ ] **All GA Blockers**: Resolved or formally deferred — see `RC_READINESS_REPORT.md §Blocker Status`
- [ ] **Go/No-Go Signoff**: `GO_NO_GO_GATE.md` signed by all roles

---

## Phase 2 — Tag and Deploy

1. Create RC tag: `npx ts-node scripts/release/ga-tag.ts --version <X.Y.Z>`
2. Monitor `release-ga.yml` CI workflow to completion
3. Deploy per `RUNBOOKS/GA_RELEASE.md §Creating a GA Release`
4. Enable Feature Flags for Launch Scope

---

## Phase 3 — Post-Deploy Validation

- [ ] **T+15m**: `node scripts/validate-summit-deploy.mjs` returns GREEN
- [ ] **T+1h**: `node scripts/detect-ga-regressions.mjs` returns GREEN
- [ ] **T+4h**: Synthetic traffic + queue review — error budget < 2% consumed
- [ ] **T+12h**: Evidence integrity audit — all ledger entries signed

First-week cadence: `RUNBOOKS/GA_FIRST_WEEK_OPERATIONS.md`

---

## Rollback Criteria

Trigger immediate rollback per `docs/runbooks/rollback-procedure.md` if:

- **Error Rate** > 1% sustained for 5 minutes
- **SLO burn rate** > 2× over budget for 10 minutes
- **Data Corruption** detected (any evidence signature mismatch)
- **Security Breach** confirmed (any unauthorized audit ledger write)
- **Cosign verification** failure post-deploy

**Rollback command**: `helm rollback <release> <previous-revision> -n <namespace>`

---

## Canonical Runbook References

| Purpose | Location |
|---------|----------|
| RC gate definition | `RC_GATE.md` |
| GA deploy procedure | `RUNBOOKS/GA_RELEASE.md` |
| First-week operations | `RUNBOOKS/GA_FIRST_WEEK_OPERATIONS.md` |
| Disaster recovery | `RUNBOOKS/DISASTER_RECOVERY.md` |
| Rollback procedure | `docs/runbooks/rollback-procedure.md` |
| Launch operations runbooks | `docs/runbooks/LAUNCH_RUNBOOKS.md` |
| GA cut checklist | `docs/runbooks/ga-cut-checklist.md` |
| Escalation matrix | `docs/runbooks/GA_ESCALATION_MATRIX.md` |
