# MVP-4 → GA Verification Matrix

This sweep captures the minimum credible verification for the GA-hardening surfaces. Each item is tied to a deterministic artifact and CI hook so reviewers can trace evidence without depending on unstable runners.

| Feature                          | Verification Artifact                                                                                                       | Tier | CI / Command              | Notes                                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Accessibility + Keyboard Gate    | `e2e/a11y-keyboard/a11y-gate.spec.ts` + `.github/workflows/a11y-keyboard-smoke.yml` (artifacts in `reports/a11y-keyboard/`) | A    | `pnpm run test:a11y-gate` | Blocks GA on critical/serious a11y or keyboard navigation regressions; uploads axe + keyboard smoke evidence. |
| Demo Mode Hard Gate              | `testing/ga-verification/ga-features.ga.test.mjs` (checks demo guard references and demo tooling)                           | B    | `make ga-verify`          | Verifies demo guard artifacts are present and tracked rather than enabling runtime changes.                   |
| Rate Limiting                    | `testing/ga-verification/ga-features.ga.test.mjs` (asserts rate-limit policy docs exist)                                    | B    | `make ga-verify`          | Ensures the documented rate-limit contract is present while Jest lane stabilizes.                             |
| AuthN/AuthZ Helpers              | `testing/ga-verification/ga-features.ga.test.mjs` (validates AuthZ summary evidence)                                        | B    | `make ga-verify`          | Confirms helper guidance is anchored to audited docs.                                                         |
| Observability Taxonomy           | `testing/ga-verification/ga-features.ga.test.mjs` (checks METRICS/LOGS/EVENTS taxonomy files)                               | B    | `make ga-verify`          | Keeps telemetry conventions stable without requiring Jest.                                                    |
| Data Classification & Governance | `testing/ga-verification/ga-features.ga.test.mjs` (ensures governance reference file is present)                            | B    | `make ga-verify`          | Guards the authoritative governance doc.                                                                      |
| Policy Preflight & Receipts      | `scripts/ga/verify-ga-surface.mjs` (schema validation for verification map + provenance doc presence)                       | C    | `make ga-verify`          | Policy-as-code validation without depending on the test runner.                                               |
| Ingestion Security Hardening     | `testing/ga-verification/ga-features.ga.test.mjs` (checks ingestion hardening evidence)                                     | B    | `make ga-verify`          | Ensures security expectations remain documented and discoverable.                                             |

## Active Waivers

The following items have been formally waived for the MVP-4 GA Release. See `docs/ga/waivers/` for details.

| Item | Waiver ID | Resolution Plan |
|------|-----------|-----------------|
| **Test Runner Stability** | `WAIVER-003` | Containerize CI verification environment. |
| **OPA Syntax Checks** | `WAIVER-001` | Upgrade OPA policies to modern Rego syntax. |
| **Quarantine Tests** | `WAIVER-002` | Refactor nondeterministic tests. |
