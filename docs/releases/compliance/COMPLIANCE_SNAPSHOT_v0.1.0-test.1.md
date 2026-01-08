# Compliance Snapshot for v0.1.0-test.1

---

## A) Scope and Disclaimers

**THIS IS NOT A CERTIFICATION OR ATTESTATION OF COMPLIANCE.**

This document is an auto-generated snapshot that maps internal controls to objective evidence produced by the CI/CD pipeline and other project artifacts. It is intended for internal review and to facilitate evidence gathering for formal audits. The presence of a control in this document does not imply it has been formally assessed or validated by a third party.

---

## B) System and Release Identity

| Item                  | Value                               |
| --------------------- | ----------------------------------- |
| **Release Target**    | `v0.1.0-test.1`                       |
| **Release Channel**   | `test`          |
| **Generated At**      | `2024-01-08T02:06:40.587Z`                  |
| **Generator Version** | `v1.0.0`               |
| **Bundle Index SHA**  | `abcdef123456` |

---

## C) Controls → Evidence Map

| Control ID | Control Area | Control Statement | Evidence | How to Verify | Exceptions/Waivers |
|------------|--------------|-------------------|----------|---------------|--------------------|
| CTRL-SC-001 | Supply Chain Integrity | The origin and contents of all third-party dependencies are documented. | **Software Bill of Materials (SBOM)**: [`dist/release/sbom.cdx.json`](dist/release/sbom.cdx.json)<br>_Note: Provides a machine-readable inventory of all software components and their dependencies._ | Inspect the artifact at `dist/release/sbom.cdx.json`. | None |
| CTRL-SC-002 | Supply Chain Integrity | The build process is documented and verifiable. | **Build Provenance**: [`dist/release/provenance.json`](dist/release/provenance.json)<br>_Note: Records how the build was produced, including the builder, source commit, and inputs._ | Inspect the artifact at `dist/release/provenance.json`. | None |
| CTRL-CICD-001 | CI/CD Integrity and Reproducibility | All release artifacts are verifiably intact and unmodified. | **Artifact Checksums**: [`dist/release/SHA256SUMS`](dist/release/SHA256SUMS)<br>_Note: SHA256 checksums for all files in the release bundle allow for integrity verification._ | Inspect the artifact at `dist/release/SHA256SUMS`. | None |
| CTRL-CICD-002 | CI/CD Integrity and Reproducibility | The release build process is designed to be deterministic and reproducible. | **Reproducibility Verification**: [`CI Job: verify-reproducible-job`](CI Job: verify-reproducible-job)<br>_Note: The CI pipeline includes a job to verify that the release build is byte-for-byte reproducible._ | Verify the status of the 'verify-reproducible-job' job in the CI/CD pipeline for the target commit. | None |
| CTRL-AUTH-001 | Approval and Release Authorization | A formal, auditable approval process is required to authorize a release to production. | **Release Status & Sign-off**: [`dist/release/release-status.json`](dist/release/release-status.json)<br>_Note: Contains the final release decision, approvers, and criteria status._ | Inspect the artifact at `dist/release/release-status.json`. | None |
| CTRL-AUTH-002 | Approval and Release Authorization | Release promotion is governed by a machine-readable policy defining gates and required approvals. | **Release Policy**: [`release-policy.yml`](release-policy.yml)<br>_Note: The canonical policy file that governs release channels, freezes, and approval requirements._ | View the file at `release-policy.yml` in the repository. | None |
| CTRL-CHG-001 | Change Tracking | All code changes included in a release are documented and traceable to a version. | **Release Notes**: [`dist/release/release-notes.md`](dist/release/release-notes.md)<br>_Note: Summarizes the changes, contributors, and scope of the release._ | Inspect the artifact at `dist/release/release-notes.md`. | None |
| CTRL-CHG-002 | Change Tracking | All release artifacts are traceable to a specific source code commit. | **Release Manifest**: [`dist/release/release-manifest.json`](dist/release/release-manifest.json)<br>_Note: Links the release artifacts to the exact Git commit SHA they were built from._ | Inspect the artifact at `dist/release/release-manifest.json`. | None |
| CTRL-IR-001 | Incident/Rollback Preparedness | The system is capable of rolling back to a previous version in case of failure. | **Rollback Plan**: [`ga/ROLLBACK.md`](ga/ROLLBACK.md)<br>_Note: Documents the strategy and procedures for performing a release rollback._ | View the file at `ga/ROLLBACK.md` in the repository. | None |
| CTRL-IR-002 | Incident/Rollback Preparedness | Post-deployment health is monitored to detect incidents. | **Canary Deployment Report**: [`Missing pointer for 'canary-report'`](Missing pointer for 'canary-report')<br>_Note: Provides results from the post-release canary deployment, verifying system health. (Note: May not be present in all bundles)_ | Inspect the artifact at `Missing pointer for 'canary-report'`. | None |
| CTRL-MON-001 | Monitoring/Alerting Readiness | Core system health metrics are defined and monitored via dashboards. | **Observability Dashboards**: [`observability/dashboards/`](observability/dashboards/)<br>_Note: Configuration-as-code for key Grafana dashboards._ | View the file at `observability/dashboards/` in the repository. | None |
| CTRL-MON-002 | Monitoring/Alerting Readiness | Alerting rules are defined as code to notify operators of critical issues. | **Alerting Rules**: [`observability/alert-rules-intelgraph.yml`](observability/alert-rules-intelgraph.yml)<br>_Note: Configuration-as-code for key Prometheus alerting rules._ | View the file at `observability/alert-rules-intelgraph.yml` in the repository. | None |
| CTRL-EX-001 | Exception Governance | A formal process exists for documenting and approving exceptions to policy (waivers). | **Waiver Report**: [`Missing pointer for 'waivers'`](Missing pointer for 'waivers')<br>_Note: A report of all active waivers, their justification, and expiry. (Note: May not be present in all bundles)_ | Inspect the artifact at `Missing pointer for 'waivers'`. | None |
| CTRL-EX-002 | Exception Governance | A formal process exists for tracking and accepting security risks. | **Security Exceptions Report**: [`Missing pointer for 'security-exceptions'`](Missing pointer for 'security-exceptions')<br>_Note: A report of all accepted security risks. (Note: May not be present in all bundles)_ | Inspect the artifact at `Missing pointer for 'security-exceptions'`. | None |
| CTRL-DATA-001 | Data Migration Safety | Database migrations are tracked in a registry and are designed to be safe. | **Migration Registry Report**: [`Missing pointer for 'migration-registry'`](Missing pointer for 'migration-registry')<br>_Note: Provides a log of all applied database migrations. (Note: May not be present in all bundles)_ | Inspect the artifact at `Missing pointer for 'migration-registry'`. | None |

---

## D) Open Risks / Exceptions Summary

*This section is a placeholder for a future implementation that will dynamically pull in data from waiver and security exception reports.*

- **Waivers**: No active waivers for this release.
- **Security Exceptions**: No active security exceptions for this release.

---

## E) Regeneration Instructions

This document was generated by the `generate_compliance_snapshot.mjs` script. To regenerate it, run the following command from the repository root, pointing to a valid release evidence bundle:

```bash
scripts/releases/generate_compliance_snapshot.mjs --target <git-sha-or-tag> --bundle-index <path/to/bundle-index.json> --output <path/to/output.md>
```