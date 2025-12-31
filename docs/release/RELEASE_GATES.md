# Release Gates

This document defines the explicit gates that must be passed for the General Availability (GA) release.

## Gate Definitions

### G-VER-01: Static Verification (Tier A)
**Objective:** Ensure all critical source files exist and contain expected structures before any runtime execution.
**Method:** `server/tests/verification/verify_ga.ts` (Tier A mode)
**Pass Criteria:** All file existence checks and regex content assertions pass.
**Blocker:** Yes.

### G-VER-02: Runtime Verification (Tier B)
**Objective:** Ensure critical modules can be loaded and export expected symbols without crashing the process.
**Method:** `server/tests/verification/verify_ga.ts` (Tier B mode)
**Pass Criteria:** All `import()` / `require()` calls succeed for critical modules.
**Blocker:** Yes (if dependencies are present).

### G-TEST-01: Node-Native Critical Tests
**Objective:** Verify core logic invariants (Taxonomy, Config, Security) using a stable, minimal test runner (`node:test`) to avoid toolchain fragility.
**Method:** `npx tsx --test test/node/ga_critical.test.ts`
**Pass Criteria:** All tests pass.
**Blocker:** Yes.

### G-SEC-01: Security Assertions
**Objective:** Verify that the implemented code matches the documented security model (Route protection, Rate limiting).
**Method:** `server/tests/verification/verify_security_claims.ts` comparing code against `docs/release/SECURITY_ASSERTIONS.md`.
**Pass Criteria:** No drift detected.
**Blocker:** Yes.

### G-SUP-01: Supply Chain Artifacts
**Objective:** Ensure release artifacts (SBOM, Provenance) are generated.
**Method:** CI Artifact check.
**Pass Criteria:** Artifacts exist in the build output.
**Blocker:** Yes.

### G-CI-01: CI Workflow
**Objective:** Ensure the entire verification suite runs automatically on PRs.
**Method:** GitHub Actions `.github/workflows/ga-verify.yml`.
**Pass Criteria:** Green build.
**Blocker:** Yes.
