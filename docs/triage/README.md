# Triage Process

This directory contains documentation and tooling for the issue triage process.

## Issue Intake

We use strictly typed Issue Forms to structure our backlog. All new issues must use one of the provided templates:

*   **Bug Report**: For defects and broken functionality.
*   **Feature Request**: For new capabilities.
*   **Security Issue**: For vulnerability reporting (Note: Sensitive issues should be reported via security advisory, this form is for non-critical tracking or internal use).
*   **Documentation**: For docs updates, corrections, or new guides.
*   **CI/Release**: For pipeline, build, and release engineering tasks.
*   **Compliance**: For audit, governance, and policy tasks.

## Triage Workflow

1.  **Validation**: An automated `issue-lint` workflow checks for required fields. Incomplete issues are labeled `needs-info`.
2.  **Labeling**: Issues are auto-labeled based on the template used.
3.  **Review**: Maintainers review `needs-triage` issues weekly.

## Automation

*   `issue-lint`: checks for empty descriptions and validity.
*   `stale`: closes inactive `needs-info` issues after 14 days.
*   `labeler`: auto-applies labels to PRs based on paths.
