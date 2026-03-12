# Summit GA Rollback Specification

## Artifact Versioning

- Release artifacts are versioned by immutable Git commit and `release/manifest.json` `release_version`.
- Deployable artifacts MUST include matching digests from `release/provenance.json` subjects.
- Rollback target MUST reference a previously verified `release-verification-report.json`.

## Rollback Procedure

1. Select the prior known-good release commit.
2. Rebuild artifacts from that commit using `.github/workflows/release-integrity.yml`.
3. Run `node scripts/release/verify-release.mjs`.
4. Compare rebuilt `release/manifest.json`, `release/sbom.json`, and `release/provenance.json` digests against archived records.
5. Promote rollback artifacts only if all hashes match and verification passes.

## Integrity Verification Before Rollback

- Confirm provenance `commit_sha` equals rollback commit.
- Confirm `release/provenance.json` includes digest subjects for manifest and SBOM.
- Confirm `.repoos/evidence/release-verification-report.json` is `verified: true`.

## Deployment Recovery Steps

1. Pause progressive delivery and pin traffic to the last healthy deployment.
2. Redeploy rollback artifacts generated from the verified rollback commit.
3. Run post-deploy smoke + health checks.
4. Record rollback event in operational incident timeline and attach evidence artifacts.
5. Resume normal deployment only after stability window is satisfied.
