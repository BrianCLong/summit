# Supply Chain Security Runbook

## Purpose
This runbook documents how to generate SBOMs, perform vulnerability diff checks, manage signing keys, and operate exception workflows for Summit supply chain gates.

## SBOM Generation
1. Ensure Syft is installed (`syft version`).
2. Run `.ci/scripts/sbom/generate_syft.sh <source> artifacts/sbom/<target>-$(git rev-parse --short HEAD).spdx.json`.
3. Upload the resulting SBOM as a build artifact; retention must be >= 365 days.

## Vulnerability Scanning & Budgets
1. Scan SBOMs with Grype and OSV:
   ```bash
   .ci/scripts/sbom/scan_grype.sh artifacts/sbom/<target>.spdx.json artifacts/vulns/grype.json artifacts/vulns/grype.sarif
   .ci/scripts/sbom/scan_osv.sh artifacts/sbom/<target>.spdx.json artifacts/vulns/osv.json artifacts/vulns/osv.sarif
   ```
2. Run the diff budget check against `origin/main` baseline:
   ```bash
   python .ci/scripts/sbom/diff_budget.py artifacts/vulns/baseline.json artifacts/vulns/current.json .maestro/ci_budget.json --summary artifacts/vulns/summary.json
   ```
3. The job fails on any new critical vulnerability or if deltas exceed budgets in `.maestro/ci_budget.json`.

## Signing and Verification
1. Prefer keyless `cosign sign <image>`; fallback keys must be rotated every 90 days.
2. Verify before promotion:
   ```bash
   cosign verify <image@digest>
   cosign verify-attestation --type slsaprovenance <image@digest>
   cosign verify-attestation --type spdx <image@digest>
   ```
3. Provenance attestations are emitted to `attestations/<artifact>.intoto.jsonl` using `.ci/scripts/attest/attest_slsa.sh`.

## Exception Workflow
1. Create `artifacts/exceptions/<sha>.json` with fields: `id`, `vulnerabilities`, `justification`, `mitigations`, `approvers` (security + platform), `expiry` (ISO8601), and `ticket`.
2. Upload the exception artifact to the PR and set `Exception ID/reference` in the PR template.
3. Exceptions automatically expire at `expiry`; alerts fire when days-to-expiry < 7.

## Air-gapped Validation
- Mirror Syft/Grype/OSV/Cosign binaries in the offline repository.
- Use `cosign verify --offline` with provided Rekor bundles.
- All SBOMs and attestations are portable JSON and should be copied into the offline verifier host.

## Key Rotation
- Rotate managed keys every 90 days; update CI secrets and re-run verification.
- For keyless, ensure OIDC trust is configured for the CI issuer; rotate workload identities every 60 days.

## Rollback
- If verification fails in promotion, abort deploy and execute auto-rollback per Epic 01.
- Remove offending artifact or regenerate SBOM + attestation, then re-run the workflow.
