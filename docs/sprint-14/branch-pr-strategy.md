# Sprint 14: Branching, PRs, and Release Strategy

## Branching Strategy

We follow a feature-branch workflow rooted in trunk-based development principles, adapted for our release cadence.

### Main Branches

- **`main`**: The "golden" integration branch. Always deployable to Dev.
- **`release/0.14.0`**: The release branch for Sprint 14. Merges from `main` or specific feature branches are cherry-picked/merged here for stabilization.
  - **Tagging**: `v0.14.0-rc1`, `v0.14.0-rc2`, etc. Final: `v0.14.0`.

### Feature Branches

Feature branches should be short-lived and map to specific Jira/GitHub Issues.

- **Naming Convention**: `feature/<short-desc>` or `fix/<short-desc>`
  - Examples:
    - `feature/prov-ledger-bundle`
    - `feature/abac-opa`
    - `feature/tri-pane-shell`
    - `feature/nl-to-cypher-sandbox`
    - `feature/slo-cost-guard`

### Branch Protections

**On `main` and `release/0.14.0`:**

1.  **Require Pull Request Reviews**: Minimum 1 approval. Code Owners must approve changes to protected paths (e.g., security policies, core schema).
2.  **Require Status Checks to Pass**:
    - `ci/test`: Unit and Integration tests.
    - `ci/lint`: ESLint, Prettier, Ruff.
    - `security/trivy`: Container scan.
    - `security/opa-check`: Policy validation.
    - `build/docker`: Successful image build.
3.  **Do Not Allow Bypassing Settings**: Admins included.

---

## Pull Request Strategy

### PR Template

All PRs must use the standard template (found in `.github/pull_request_template.md`).

**Key Sections:**

-   **What & Why**: Brief summary of changes.
-   **Acceptance Criteria Checklist**:
    -   [ ] Tests added/updated (Unit/E2E)
    -   [ ] Dashboards updated (if applicable)
    -   [ ] OPA policy reviewed (if applicable)
    -   [ ] Docs updated
-   **Risk & Rollback**: What happens if this breaks?
-   **Demo Notes**: Instructions to verify the change.

### Definition of Done (DoD)

A PR is considered "Done" and ready to merge when:

1.  All CI checks pass (Green).
2.  Code coverage meets the threshold (85% for core services).
3.  Feature flagged if incomplete or high-risk.
4.  Documentation updated (API docs, Schema).
5.  Approved by at least one peer (and Security for sensitive changes).

---

## Release Process (Sprint 14)

1.  **Code Freeze**: Sep 11, 12:00 PM MDT.
    -   Only critical bug fixes allowed on `release/0.14.0`.
2.  **Release Candidate**:
    -   CI builds `v0.14.0-rc1`.
    -   Deployed to **Staging** for verification.
    -   Run `make k6-smoke` against Staging.
3.  **Go/No-Go**:
    -   Review metrics (SLO burn, Error rate).
    -   Review outstanding blockers.
4.  **Final Release**:
    -   Tag `v0.14.0`.
    -   Deploy to **Prod**.
    -   Monitor "Golden Signals" for 1 hour.
