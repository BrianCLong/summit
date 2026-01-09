# Evidence Bundle

The Evidence Bundle is a unified artifact produced by CI that aggregates compliance, security, and quality evidence for a specific commit. It is designed to be verifiable and deterministic.

## Contents

The bundle is a JSON file containing:

1.  **Meta**: Build metadata (git sha, branch, timestamp, environment).
2.  **Governance**: Verdicts from governance checks (policy validation).
3.  **Artifacts**:
    -   **SBOM**: Software Bill of Materials (simulated/generated).
    -   **Licenses**: Inventory of licenses used.
4.  **Verification**: Summary of test results and verification suites.
5.  **Provenance**: SLSA provenance attestation (currently a valid stub).

## Usage

### Generating the Bundle

To generate the evidence bundle locally:

```bash
pnpm evidence:generate
```

This will create `evidence/out/evidence-bundle.json`.

**Note**: The generator is deterministic and avoids network calls where possible, but may rely on local environment variables (like `CI=true`).

### Verifying the Bundle

To verify a generated bundle:

```bash
pnpm evidence:verify
```

This script checks:
-   **Schema Validity**: Ensures the JSON matches the `evidence-bundle.schema.json`.
-   **Consistency**: Checks if the Git SHA in the bundle matches the current HEAD.
-   **Freshness**: Ensures the bundle was created recently (default 1 hour).
-   **Completeness**: Ensures no required fields are missing.

### CI Integration

In CI, the bundle is generated after tests and checks pass. It is then verified and uploaded as an artifact named `evidence-bundle-<SHA>`.

## Provenance Stub

Currently, the provenance is a **stub**. This means it follows the SLSA structure but is explicitly marked as `attestationStatus: "stub"`. It serves as a placeholder until the full OIDC-based signing and generation is implemented.

See [Issue #123](https://github.com/BrianCLong/summit/issues/123) for the full SLSA implementation plan.

## Extending the Schema

1.  Modify `evidence/schema/evidence-bundle.schema.json`.
2.  Update the version number in the schema file.
3.  Update the `generate_evidence_bundle.ts` script to populate the new fields.
4.  Update the `verify_evidence_bundle.ts` script if custom validation logic is needed.
5.  Run tests to ensure backward compatibility or handle breaking changes.
