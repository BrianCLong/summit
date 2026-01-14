# Attested Release Pipeline (GA)

## Objective

Implement a deterministic GA tag release pipeline that assembles release assets, generates SBOMs,
creates evidence bundles, and emits OIDC-based attestations for release artifacts. Provide scripts
for assembling and verifying release assets offline, and document the release flow.

## Scope

- `.github/workflows/release-attested.yml`
- `scripts/release/assemble_release_assets.mjs`
- `scripts/release/verify_release_assets.mjs`
- `scripts/evidence/*` (integration)
- `docs/releases/ATTESTED_RELEASES.md`
- `package.json` scripts
- `docs/roadmap/STATUS.json`

## Constraints

- No long-lived secrets; prefer GitHub OIDC and least privilege.
- Deterministic naming and stable job names.
- Publishing must be opt-in and guarded.
- No new heavy dependencies.

## Deliverables

- Tag-triggered GitHub Actions workflow.
- Release asset bundler script with manifest + checksums.
- Offline verifier with attestation verification support.
- Documentation for release and verification process.
