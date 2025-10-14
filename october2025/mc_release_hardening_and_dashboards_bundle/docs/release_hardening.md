# Release Lane Hardening (SBOM + Provenance Required)

This lane creates a hardened release whenever you push a semver tag (`v*.*.*`). It:
1. Builds the project on Node 20 and generates a CycloneDX SBOM.
2. Produces SLSA v3 provenance via the official generator.
3. Gates the release on evidence presence (SBOM and provenance).

## Prereqs
- `corepack` + `pnpm` in use across repo.
- Set `PROVENANCE_SUBJECT_B64` secret if you want to bind provenance to a specific artifact hash.
- Optionally add OPA policy or GitHub branch protection rules to *require* this workflow to pass on tags.

## Notes
- The SLSA generator uploads attestations to the release (see the workflow logs and release assets).
- Extend `verify-release` to hard-fail if an attestation API call returns empty for the tag.
