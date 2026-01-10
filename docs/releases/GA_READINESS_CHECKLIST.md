# GA Readiness Checklist

**Version:** 1.0
**Context:** Summit Platform V1+
**Role:** Release Captain

**Reference:** `docs/releases/GA_TO_GA_PLAYBOOK.md`

---

## 1. Hard Gates (Must Be Green)

### Security & Compliance
- [ ] **Hardening Suite Passed**: `./scripts/security-hardening-suite.sh` returns 0.
- [ ] **Vulnerabilities Resolved**: `./scripts/scan-vulnerabilities.sh` shows 0 Critical/High (or waivers signed).
- [ ] **Artifacts Signed**: `./scripts/sign-artifacts.sh` completed successfully.
- [ ] **Traceability**: `scripts/check_traceability.cjs` confirms coverage of critical paths.

### Quality & Stability
- [ ] **CI Green**: Main branch build passes all tests.
- [ ] **Core Validation**: `./scripts/ga-core-go-nogo.sh --run-validate` passes.
- [ ] **Load Test**: `./scripts/ga-core-go-nogo.sh --run-load` passes performance baselines.
- [ ] **Staging Deploy**: `./scripts/ga-core-go-nogo.sh --deploy-staging` succeeds.

### Operations
- [ ] **Weekly Evidence**: Most recent run of `docs/ops/WEEKLY_EVIDENCE_RUNBOOK.md` is `status: pass`.
- [ ] **Migration Verified**: Database migrations tested against staging data copy.

---

## 2. Informational Checks (Review Required)

- [ ] **Changelog**: `CHANGELOG.md` accurately reflects the release content.
- [ ] **Documentation**: `RELEASE_NOTES.md` drafted and reviewed.
- [ ] **Risk Ledger**: Review `docs/security/RISK_LEDGER.md` for any new accepted risks.
- [ ] **Versioning**: Confirmed version number matches Semantic Versioning (e.g., no breaking changes in minor/patch).

---

## 3. Go/No-Go Declaration

**Decision:**
- [ ] **GO**: Proceed to Tag and Release.
- [ ] **NO-GO**: Halt. Remediation required.

**Signed By:** ____________________ (Release Captain)
**Date:** ____________________
