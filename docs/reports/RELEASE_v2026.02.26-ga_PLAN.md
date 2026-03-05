# Release Cut Plan: v2026.02.26-ga

**Target Tag:** v2026.02.26-ga
**Target Commit:** cd3a0537f149eefede9901b16541a207dc126190 (HEAD)
**Previous GA:** v2026.02.08-ga (c1ca065a484d1fe24682fd24591c07112e2b1039)
**Date:** 2026-02-26

## Objective
Establish an audit-grade GA artifact that pins governance enforcement and supply-chain evidence, resolving drift from the previous GA.

## Required Checks Policy (v2.1.0)
The following checks are **ALWAYS REQUIRED** for this release, based on `docs/ci/REQUIRED_CHECKS_POLICY.yml`:

- `meta-gate` (Unified governance verification)
- `CI Core Gate ✅` (Primary blocking gate)
- `Unit Tests` (Primary PR test gate)
- `gate` (Official GA gate job)
- `Release Readiness Gate` (Comprehensive verification)
- `test (20.x)` (Test suite and coverage)
- `SOC Controls` (Audit readiness)
- `Workflow Validity Check` (Syntax validity)

## Execution Plan
1.  **Verification:** Run security and governance verification suites locally.
2.  **Branch Protection Audit:** Generate reconciliation plan to identify drift between policy and GitHub settings.
3.  **Supply Chain Artifacts:** Collect/Generate SBOMs and Vulnerability Reports.
4.  **Evidence Bundle:** Generate deterministic evidence bundle containing all artifacts and SHA256 hashes.
5.  **Documentation:** Publish release notes and evidence index.
6.  **Tagging:** Git tag and release.

## Audit Trail
- **Verification Status:** `npm run verify` passed (12/12 checks).
- **Drift Status:** `npm run ci:branch-protection:check` detected drift (reconciliation plan attached).
