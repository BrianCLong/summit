# Release Captain GA Checklist

**Version:** 1.0
**Last Updated:** 2026-01-05

This checklist must be completed by the Release Captain before tagging a General Availability (GA) release.

## 1. Pre-Release Verification

- [ ] **CI Green**: Main branch build is passing.
- [ ] **Security Scan**: No critical vulnerabilities in dependencies.
- [ ] **Change Log**: `CHANGELOG.md` is updated with all features and fixes.
- [ ] **Versioning**: Semantic versioning rules followed (e.g., `v1.2.0`).
- [ ] **RC Tag Created**: Latest `vX.Y.Z-rc.N` tag exists for the GA SHA.
- [ ] **Draft RC Release**: Draft GitHub Release created for the RC tag.
- [ ] **Evidence + Trust Snapshot**: RC draft release attaches evidence bundle and trust snapshot assets.

## 2. Evidence Collection (Automated)

The release pipeline will generate the following. Verify their existence after the dry-run:

- [ ] `sbom.cdx.json` (CycloneDX SBOM)
- [ ] `vuln-report.json` (Vulnerability Report)
- [ ] `test-summary.json` (Test Results)
- [ ] `soc-controls.json` (Control Verification)

## 3. Governance & Approval

- [ ] **Board Approval**: Scheduled/Completed approval session.
- [ ] **Sign-off**: Release Captain sign-off recorded in `release_log.md` (or equivalent).
- [ ] **MCP Governance**: Model Context Protocol policies reviewed (if applicable).

## 4. Execution

- [ ] Run `git tag -a vX.Y.Z -m "GA Release vX.Y.Z"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Monitor `release-ga` workflow.
- [ ] Verify GitHub Release created with "Evidence Bundle" attached.
- [ ] **Publish Approval Recorded**: Release publish approval logged via the `rc-release-publish` environment.

## 5. Post-Release

- [ ] Announce on Slack/Teams.
- [ ] Verify deployment in Staging/Prod.
