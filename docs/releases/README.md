# Release Governance & Evidence

This directory documents the "Release Governance Spine" — the canonical workflow for verifying release readiness and generating evidence bundles.

## The One Way to Release

We enforce a single, deterministic path to production that integrates:
1.  **Verification**: Static analysis and runtime validation (gates).
2.  **Evidence**: Comprehensive collection of artifacts, logs, and signatures.
3.  **Governance**: Policy checks against the collected evidence.

### Workflow

The process is orchestrated by the `Release Governance Spine` GitHub Workflow (`.github/workflows/release-governance.yml`).

#### Triggers
*   **Manual**: Run `Release Governance Spine` via GitHub Actions UI.
    *   Inputs: `channel` (canary/stable), `target` (production/staging).
*   **Automated**: Open a Pull Request with the `release-intent` label.

### Scripts

The logic is encapsulated in `scripts/governance/`:

*   **`verify.ts`**: The master gatekeeper.
    *   Runs static checks (strict mode, audit logs, patterns).
    *   Orchestrates runtime verification via `verify-runtime.sh`.
    *   Outputs: `.out/artifacts/gate/gate-report.json`.
    *   Usage: `npx tsx scripts/governance/verify.ts --check-type all --out-dir .out/artifacts`

*   **`generate-evidence.ts`**: The evidence collector.
    *   Collects CI artifacts, workflow files, and docker configs.
    *   Runs (or mocks) SLO validation checks (k6).
    *   Generates security attestations (SBOM, Cosign).
    *   Outputs: `.out/artifacts/bundle/` (The Release Bundle).
    *   Usage: `npx tsx scripts/governance/generate-evidence.ts --out-dir .out/artifacts`

### Artifacts

A successful run produces:

1.  **`gate-results`**: Detailed pass/fail report of all checks.
2.  **`release-evidence-bundle`**: The "zippable" bundle for auditors/release.
    *   `ci-artifacts.json`
    *   `slo-validation.json`
    *   `security-evidence.json`
    *   `provenance-attestations.json`
    *   `BUNDLE_SUMMARY.md`

### Policies

Policies are defined in `deploy/compose/policies/` (OPA Rego) and `release/ga-gate.yaml` (Static Gates).
