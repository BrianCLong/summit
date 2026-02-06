# Repository Assumptions

## Verified
- **Workflows:**
  - `.github/workflows/sbom-scan.yml` exists and uses `anchore/sbom-action`.
  - `.github/workflows/release-integrity.yml` exists and uses a mock SBOM generator.
- **Tools:**
  - `anchore/sbom-action` is used.
  - `scripts/compliance/generate_sbom.ts` generates a mock SBOM.

## Assumed
- **Melange:** No explicit usage of `melange` or `apko` found in root, `.github/workflows`, or `docker`.
- **Cosign:** Assumed available in GitHub Actions runner or installable via `sigstore/cosign-installer`.

## Policy
- **Refuse Melange:** Any future introduction of `melange` must be gated by version `>= 0.40.3`.
- **Enforce Pinning:** All actions must be pinned to SHA.

