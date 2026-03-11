# IntelGraph Release Process

This document provides a high-level overview of the release process for the IntelGraph platform.

## Release Types

- **Release Candidates (RC):** Intermediate builds used for testing and validation. Tags follow the `vX.Y.Z-rc.N` format.
- **General Availability (GA):** Canonical, production-ready releases. Tags follow the `vX.Y.Z` format.

## Release Lifecycle

1. **Development:** Features and bug fixes are merged into `main`.
2. **RC Creation:** An RC is cut from `main` to initiate formal testing.
3. **Verification:** Automated CI gates, security scans, and manual QA are performed on the RC.
4. **GA Promotion:** Once an RC is verified, it is promoted to GA by pushing a versioned tag.
5. **Approval:** GA releases require two-person approval via GitHub Environments.

## Detailed Documentation

For step-by-step procedures, refer to the following runbooks:

- **[GA Release Runbook](docs/runbooks/GA_RELEASE_RUNBOOK.md):** The primary guide for executing a GA release.
- **[Release GA Pipeline](docs/ci/RELEASE_GA_PIPELINE.md):** Technical details of the CI/CD pipeline stages.
- **[Rollback Playbook](docs/playbooks/ROLLBACK_PLAYBOOK.md):** Procedures for handling failed releases.
- **[Monitoring Guide](docs/operations/GA_RELEASE_MONITORING.md):** Post-release observability and alerting.

## Governance

Releases are governed by the **Antigravity** agent, which ensures compliance with project policies and maintains an immutable ledger of release evidence.
