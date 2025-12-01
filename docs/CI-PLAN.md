# CI/CD & Merge Train Plan

## 1. CI Strategy

We are adopting a streamlined, 3-lane CI strategy to ensure reliability and speed.

### Lanes

1.  **Fast Lane (`ci-lint-and-unit.yml`)**
    *   **Scope**: PRs, Main.
    *   **Checks**: `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
    *   **Goal**: fail fast (< 5 mins).
    *   **Status**: Implemented.

2.  **Golden Path Lane (`ci-golden-path.yml`)**
    *   **Scope**: PRs (optional/conditional), Main, Nightly.
    *   **Checks**: `make bootstrap`, `make up`, `make smoke`.
    *   **Goal**: Guarantee the "deployable-first" promise.
    *   **Status**: Implemented.

3.  **Security Lane (`security.yml`)**
    *   **Scope**: Main, Nightly.
    *   **Checks**: CodeQL, Dependency Review, Gitleaks.
    *   **Status**: Implemented.

### Consolidation
We will delete legacy workflows that duplicate these functions to reduce noise and confusion.

## 2. Branch Protection & Policy

The following checks will be **Required** on `main`:
*   `lint-and-unit` (from `ci-lint-and-unit.yml`)
*   `golden-path` (from `ci-golden-path.yml`)
*   `CodeQL` (from `security.yml`) - *Optional for now if slow, but recommended.*

## 3. Merge Train Strategy

We will implement a "Label-Driven" merge train.

*   **Label**: `automerge-safe`
*   **Mechanism**:
    *   A script/bot polls for PRs with this label.
    *   **Loop**:
        1.  Pick highest priority PR.
        2.  Update branch from `main` (rebase preferred, or merge).
        3.  Wait for CI (Fast Lane + Golden Path).
        4.  If Green: Merge.
        5.  If Red: Remove label, comment on PR.
*   **Automation**:
    *   We will use `scripts/merge-train.sh` to drive this process locally or via a dispatch workflow.

## 4. Actions

1.  **Cleanup**: Delete `ci-test.yml`, `ci.yml`, `ci.main.yml`, `ci-comprehensive.yml`, and other noise.
2.  **Docs**: Update `README.md` and create `RUNBOOKS/CI.md`.
3.  **Tooling**: Create `scripts/merge-train.sh`.
