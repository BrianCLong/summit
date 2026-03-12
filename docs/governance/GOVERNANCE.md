Owner: Governance Team
Last-Reviewed: 2026-03-12
Evidence-IDs: GA-EVIDENCE-GOVERNANCE-SPEC
Status: active

# Summit Governance Specification

This document serves as the canonical governance specification for the Summit repository. It defines how contributors and maintainers collaborate to ensure system integrity, security, and velocity.

## 1. Golden Main Principle
The `main` branch is the "Golden Main". It must remain in a stable, deployable state at all times.
- Direct commits to `main` are strictly prohibited.
- All changes must be integrated via Pull Requests (PRs).
- Failed CI runs must never be merged into `main`. Force-merging is a violation of governance policy.

## 2. Contribution Guidelines
Contributors should refer to the [CONTRIBUTING.md](../../CONTRIBUTING.md) file for setup and local development instructions.
- Create feature branches originating from the latest `main`.
- Branch naming convention: `feature/<description>`, `bugfix/<description>`, or `docs/<description>`.
- Use descriptive commit messages following the Conventional Commits specification.

## 3. Pull Request Review Process
- All PRs require at least one approving review from an authorized code owner.
- PR descriptions must articulate:
  - **Commander's Intent:** What gap is closed or capability added?
  - **Abuse Analysis:** How is the change secured against misuse?
- Reviews must prioritize security boundaries, deterministic evidence output, and operational resilience.
- Do not approve PRs with unresolved discussions or failing checks.

## 4. Required CI Checks
Before a PR can be merged, the following mandatory gates must pass:
1. **Agent Policy Check (ACP):** Validates deterministic execution constraints.
2. **Evidence Schema Check:** Ensures evidence artifacts conform to registered schemas.
3. **S-AOS Enforcement:** Verifies system homeostasis and continuity laws.
4. **Security & PII Scans:** Validates that no credentials or PII leak into logs or artifacts.

## 5. Release Cadence
- Merges to `main` trigger automated builds.
- Releases are tagged sequentially following Semantic Versioning (SemVer) principles.
- High-severity security patches are expedited outside the standard release cadence, maintaining mandatory CI gates.

## 6. Code Ownership
- Specific subdirectories and functional domains are protected by strict code ownership rules.
- Review the `CODEOWNERS` file in the repository root for domain-specific maintainers.
- Architectural Decision Records (ADRs) are maintained in `docs/adr/`. Superseded decisions must be updated rather than deleted.

## 7. Decision-Making & Conflict Resolution
- Technical disputes are resolved through consensus within the PR review phase.
- If consensus cannot be reached, the issue is escalated to the core maintainers.
- Changes impacting security boundaries or governance rules require explicit authorization from the Governance Team.
