Owner: Governance
Last-Reviewed: 2026-01-20
Evidence-IDs: none
Status: active

# Governance Rules

This document defines the rules for code changes, releases, and approvals within the repository. It is machine-enforced where possible.

## 1. Release Types & Versioning

We adhere to [Semantic Versioning 2.0.0](https://semver.org/).

| Type      | Description                        | Trigger                               | Version Bump         | Approval Required     |
| :-------- | :--------------------------------- | :------------------------------------ | :------------------- | :-------------------- |
| **Patch** | Bug fixes, backward-compatible.    | PR merged to `main`                   | `x.y.Z` -> `x.y.Z+1` | Peer Review (1)       |
| **Minor** | New features, backward-compatible. | PR merged to `main` (feature flagged) | `x.Y.z` -> `x.Y+1.0` | Maintainer Review (1) |
| **Major** | Breaking changes.                  | Release Branch cut                    | `X.y.z` -> `X+1.0.0` | Governance Board      |

## 2. Approval Matrix

Who can approve what?

| Artifact / Area                                | Approver Role                | Required Checks                      |
| :--------------------------------------------- | :--------------------------- | :----------------------------------- |
| **Core Infrastructure** (`infra/`)             | DevOps Lead / Principal      | Terraform Plan, Security Scan        |
| **Security Policy** (`policy/`, `SECURITY.md`) | Security Officer             | Policy Check, Compliance Drift Check |
| **Database Migrations** (`migrations/`)        | Data Architect               | Migration Dry-Run                    |
| **Documentation** (`docs/`)                    | Tech Writer / Any Maintainer | Link Check, Spell Check              |
| **Standard Code**                              | Peer (Any Developer)         | Tests Pass, Lint Pass                |

## 3. Forbidden Actions (Machine Enforced)

The following actions will cause CI failure:

1.  **Breaking Changes without Major Version:** API contract tests (`check_api_parity.ts`) fail.
2.  **Missing Evidence:** PRs labeled `compliance` must include updates to `EVIDENCE_INDEX.md`.
3.  **Governance Drift:** Modifying `GOVERNANCE_RULES.md` without `CODEOWNERS` approval.
4.  **Force Push to Main:** Blocked by branch protection rules.
5.  **Sensitive File Commit:** Blocked by pre-commit hooks (secrets detection).

## 4. Policy Enforcement

- **CI/CD:** GitHub Actions enforce unit tests, linting, and security scans on every PR.
- **Compliance Drift:** The `verify-compliance-drift` job runs on schedule to ensure evidence artifacts still exist.
- **Governance Drift:** The `check-drift` job runs daily to detect unauthorized policy changes.
- **Evidence Freshness:** The `fresh-evidence-rate` job continuously monitors the age of evidence artifacts.

## 5. Reporting

- **Weekly GA Ops Snapshot:** A required weekly report capturing the state of governance drift, evidence freshness, and operational health. This snapshot serves as the primary artifact for executive review.
