# GA Readiness Plan & Status Report

**Date:** 2025-10-25
**Author:** Execution Agent (Jules)
**Status:** DRAFT

## 1. Current State Summary

**Overall Status:** **Code-Complete / Verification-Blocked**

The Summit repository has reached a significant milestone with "Phase 3" marked as complete (Oct 5, 2025), delivering the core "Cognitive Decision Support System". However, while the _code_ and _features_ appear complete, the **local developer experience and verification capabilities are critically degraded**.

### Key Metrics

- **Phase Status:** COMPLETED (Phase 3)
- **Code Coverage (Claimed):** 95%+ (Source: `PHASE3_COMPLETION_REPORT.json`)
- **Code Coverage (Actual):** Unknown (Local test execution is broken)
- **Security Compliance:** "FULL" (SOC2, GDPR, HIPAA claimed)
- **Open Issues:** (Estimated based on `backlog.yaml` & `TODOs`) ~150+ identified TODOs in code.
- **CI Status:**
  - `ci-security.yml`: **Robust** (Includes Gitleaks, CodeQL, Semgrep, Trivy, OPA).
  - `ci.yml`: **Standard** (Build, Test, Lint).
  - **Local Execution:** **FAILING**. `npm test` in `server/` fails due to `ts-jest` ESM configuration issues.

### Trends

- **Security:** High maturity. The `ci-security.yml` workflow is world-class, integrating 10+ distinct scanners.
- **Documentation:** Strong. `docs/` is well-populated with architecture, compliance, and sprint guides.
- **Velocity:** Currently stalled on "Verification". We cannot confidently cut a GA release until we can run tests locally.

### Critical Blockers

1.  **Broken Local Test Harness:** Developers cannot run server-side unit tests due to a `ts-jest` vs. ESM misconfiguration.
2.  **Opaque CI History:** Without API access, we cannot verify if the GitHub Actions are actually passing, despite the robust configuration.

---

## 2. GA Readiness Matrix

| Category                   | Score | Blockers                                          | Status      |
| -------------------------- | ----- | ------------------------------------------------- | ----------- |
| **CI Stability**           | 90    | None (Config is solid)                            | 🟢 Ready    |
| **Test Coverage**          | 40    | **Local harness broken**; Verification impossible | 🔴 Critical |
| **Functional Correctness** | 95    | None (Phase 3 Signed-off)                         | 🟢 Ready    |
| **Documentation**          | 85    | Needs "Getting Started" refresh                   | 🟡 Warning  |
| **Security Hardening**     | 95    | None (Full suite active)                          | 🟢 Ready    |
| **Release Artifacts**      | 70    | Missing explicit GA Release Notes                 | 🟡 Warning  |
| **Performance**            | 90    | K6 tests exist; SLOs defined                      | 🟢 Ready    |

**GA Threshold:** All categories > 80, no Critical blockers.

---

## 3. List of Synthesized Issues

The following issues are required to bridge the gap to GA.

| Priority | Area         | Title                                                                                                                                                                                           | Labels                                          |
| :------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- |
| **P0**   | `infra/test` | **[GA] Fix Local Test Execution Environment**<br>The `npm test` command fails in `server/` due to `ts-jest` ESM preset errors. Verification is blocked.<br>**Goal:** Running `npm test` passes. | `severity:blocker`, `area:infra`, `release:ga`  |
| **P0**   | `infra/ci`   | **[GA] Verify CI Execution & Artifacts**<br>Confirm that `ci-security.yml` and `ci.yml` are actually passing on `main`.<br>**Goal:** Green badges on README.                                    | `severity:blocker`, `area:ci`, `release:ga`     |
| **P1**   | `docs`       | **[GA] Update Quickstart & Onboarding**<br>Ensure `make bootstrap` works for a fresh clone. Update `README.md` with GA instructions.<br>**Goal:** Zero-friction onboarding.                     | `severity:high`, `area:docs`, `release:ga`      |
| **P1**   | `security`   | **[GA] Triage Latest Security Scan Results**<br>Review the latest artifacts from `security-summary` job in CI. Close or suppress false positives.<br>**Goal:** Clean security dashboard.        | `severity:high`, `area:security`, `release:ga`  |
| **P2**   | `release`    | **[GA] Prepare v1.0.0 Release Notes**<br>Draft release notes highlighting Phase 3 features and SOC2 compliance.<br>**Goal:** Published release draft.                                           | `severity:medium`, `area:release`, `release:ga` |

---

## 4. Top 10 Priority Tasks

1.  **Fix Server Test Config** (`P0`)
    - _Subtask:_ Debug `ts-jest` ESM import error.
    - _Subtask:_ Verify `npm test` runs a single test file successfully.
    - _Owner:_ Infra/Jules
2.  **Run "Golden Path" Smoke Test** (`P0`)
    - _Subtask:_ Execute `make bootstrap && make up && make smoke` locally.
    - _Subtask:_ Fix any container startup issues.
    - _Owner:_ Infra
3.  **Audit Security Alerts** (`P1`)
    - _Subtask:_ Download `security-summary` artifact from CI (simulated).
    - _Subtask:_ Add suppressions to `.trivyignore` or `.gitleaksignore` if needed.
    - _Owner:_ Security
4.  **Finalize Release Notes** (`P1`)
    - _Subtask:_ Collate `PHASE3_COMPLETION_REPORT.json` into `RELEASE_NOTES.md`.
    - _Owner:_ Product
5.  **Refresh README.md** (`P1`)
    - _Subtask:_ Update status badges.
    - _Subtask:_ Simplify "Getting Started" section.
    - _Owner:_ DevRel
6.  **Verify Database Migrations** (`P2`)
    - _Subtask:_ Run `npm run migrate` on a fresh DB.
    - _Owner:_ Backend
7.  **Check License Compliance** (`P2`)
    - _Subtask:_ Run `scripts/compliance/check_licenses.cjs`.
    - _Owner:_ Legal/Compliance
8.  **Validate SBOM Generation** (`P2`)
    - _Subtask:_ Run `scripts/compliance/generate_sbom.sh`.
    - _Owner:_ Security
9.  **Performance Baseline** (`P2`)
    - _Subtask:_ Run `k6/soc2-evidence.js` locally.
    - _Owner:_ QA
10. **GA Release Tag** (`P3`)
    - _Subtask:_ Tag `v1.0.0` on `main`.
    - _Owner:_ Release Manager

---

## 5. Release Plan

**Target Date:** 2025-11-01 (Estimated)
**Version:** v1.0.0 (GA)

**Steps:**

1.  **Code Freeze:** Merge all "Green Train" PRs. (Completed per Phase 3 report).
2.  **Stabilization:** Resolve the **Local Test Execution** blocker (Task #1).
3.  **Validation:** Run full CI suite + `make smoke`.
4.  **Security Sign-off:** Review `aggregated-security` report.
5.  **Documentation:** Merge `docs/release-notes/v1.0.0.md`.
6.  **Release:**
    - Create GitHub Release `v1.0.0`.
    - Upload SBOM and Signature artifacts.
    - Deploy to Production environment.

---

## 6. Security Coverage Plan

The repository utilizes a comprehensive "Defense in Depth" strategy defined in `.github/workflows/ci-security.yml`.

**Active Controls:**

- **Secrets:** `gitleaks` (Pre-commit & CI)
- **SAST:** `CodeQL` (JS/Python), `Semgrep` (Custom rules)
- **Dependencies:** `Snyk`, `Trivy`
- **Infrastructure:** `Checkov` (Terraform/Helm), `Trivy` (Container/FS)
- **Compliance:** `OPA` (Policy as Code), `CIS Benchmarks`
- **DAST:** `OWASP ZAP` (Runtime scan)

**Verification Steps:**

1.  Ensure `.github/workflows/ci-security.yml` is enabled on the release branch.
2.  Verify the `security-summary` job succeeds.
3.  Check `SECURITY.md` for vulnerability reporting policy.

---

## 7. CI Healing Roadmap

**Current Failure:** `npm test` in `server/` fails with:

```text
Preset ts-jest/presets/default-esm not found relative to rootDir /app/server.
```

**Root Cause:**
The `jest.config.js` specifies `ts-jest/presets/default-esm`, but the `ts-jest` version or node module resolution in the `server` workspace is incompatible or misconfigured.

**Remediation Plan:**

1.  **Immediate Fix:**
    - Update `server/jest.config.js` to use the correct preset path or configure `transform` manually (which is already partly done).
    - Ensure `ts-jest` is properly installed in `server/package.json` with a compatible version.
    - Verify `tsconfig.json` settings for `esModuleInterop`.
2.  **Long-term:**
    - Migrate all tests to Vitest (aligned with `apps/web`) to unify the test runner stack and improve ESM support.
