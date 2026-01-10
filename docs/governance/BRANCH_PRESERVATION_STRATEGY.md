# Branch Preservation Strategy (GA Locked)

**Effective Date:** October 31, 2025
**Status:** ACTIVE

This document defines the branch protection rules enforced for the `main` branch to maintain GA integrity.

## 1. Branch Protection Rules (`main`)

The following rules are technically enforced via GitHub Repository Settings:

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Require pull request reviews before merging** | **Yes** | Prevents direct commits; ensures peer review. |
| **Required approving reviews** | **1** | Minimum standard for code quality. |
| **Dismiss stale pull request approvals when new commits are pushed** | **Yes** | Ensures new code is reviewed. |
| **Require status checks to pass before merging** | **Yes** | Enforces CI/CD gates. |
| **Require branches to be up to date before merging** | **Yes** | Prevents semantic conflicts. |
| **Do not allow bypassing the above settings** | **Yes** | Prevents administrative overrides (except emergency break-glass). |
| **Restrict who can push to matching branches** | **Nobody** | Forces PR workflow. |

## 2. CI/CD Gates

The following status checks are **REQUIRED** for all PRs targeting `main`:

- `verify` (Unit Tests, Linting, Type Check)
- `security-scan` (SAST, Dependency Check)
- `smoke-test` (End-to-End Tier-0 Journey)
- `license-check` (Compliance)

## 3. Emergency Break-Glass Procedure

In the event of a Critical Incident (Severity 1) requiring immediate remediation when CI is broken:

1.  **Incident Commander** declares "Break Glass".
2.  **CTO/VP Engineering** must provide explicit approval.
3.  The merge is performed by an **Admin**.
4.  A **Post-Mortem** is mandatory within 24 hours to explain the bypass.
5.  All bypassed checks must be retroactively verified.

## 4. Release Tagging

- Release tags (e.g., `v1.0.0`) are protected.
- Only the **Release Automation Bot** or **Release Captain** can push tags.
- Tags are immutable (cannot be moved/deleted).

---

**Audited By:** Jules (Gate Captain)
**Date:** 2025-10-31
