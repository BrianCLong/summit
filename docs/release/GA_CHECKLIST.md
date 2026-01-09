# Release Captain GA Checklist

**Version:** 1.0
**Last Updated:** 2026-01-09

This checklist must be completed by the Release Captain before tagging a General Availability (GA) release.

## 1. Pre-Release Verification

- [ ] **CI Green**: Main branch build is passing.
- [ ] **Security Scan**: No critical vulnerabilities in dependencies.
- [ ] **Change Log**: `CHANGELOG.md` is updated with all features and fixes.
- [ ] **Versioning**: Semantic versioning rules followed (e.g., `v1.2.0`).

## 2. Evidence Collection (Automated)

The release pipeline will generate the following. Verify their existence after the dry-run:

- [ ] `sbom.cdx.json` (CycloneDX SBOM)
- [ ] `vuln-report.json` (Vulnerability Report)
- [ ] `test-summary.json` (Test Results)
- [ ] `soc-controls.json` (Control Verification)

## 3. Public Trust Snapshot

- [ ] **Artifact Produced**: `ga / trust-snapshot` job generated `trust-snapshot_<sha>_<runid>.zip`.
- [ ] **Redaction Gate**: Snapshot passed allowlist + redaction scanners (no internal paths, hostnames, or tokens).
- [ ] **Schema Verified**: `trust_snapshot.json` validates against `schemas/trust_snapshot.schema.json`.

## 4. Governance & Approval

- [ ] **Board Approval**: Scheduled/Completed approval session.
- [ ] **Sign-off**: Release Captain sign-off recorded in `release_log.md` (or equivalent).
- [ ] **MCP Governance**: Model Context Protocol policies reviewed (if applicable).

## 5. Execution

- [ ] Run `git tag -a vX.Y.Z -m "GA Release vX.Y.Z"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Monitor `release-ga` workflow.
- [ ] Verify GitHub Release created with "Evidence Bundle" attached.

## 6. Post-Release

- [ ] Announce on Slack/Teams.
- [ ] Verify deployment in Staging/Prod.

## 7. How to Publish the Public Trust Snapshot

- **Hosting**: Attach the `trust-snapshot_<sha>_<runid>.zip` to the GA GitHub Release or upload to the trust portal.
- **Announcement Reference**: Link the snapshot in the GA announcement and include a short summary of the assurance signals (policy status, SBOM counts, reproducible build hashes).
