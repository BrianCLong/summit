# Backport Process and Conventions

This document outlines the standard process for handling backports to release branches (e.g., `release/0.3`).

## Labels

We use the following labels to manage backports:

- **`backport/needed`**: Indicates a PR should be considered for backporting.
- **`backport/release-X.Y`** (e.g., `backport/release-0.3`): Specifies the target release series.
- **`backport/done`**: Indicates the backport has been successfully applied.

## Process

1.  **Merge to Main**: All changes must land in `main` first.
2.  **Labeling**:
    - If a change fixes a bug relevant to a stable release, add `backport/needed` and the target series label (e.g., `backport/release-0.3`).
3.  **Cherry-Pick**:
    - Checkout the release branch: `git checkout release/0.3`
    - Pull latest: `git pull origin release/0.3`
    - Cherry-pick the commit from main: `git cherry-pick <commit-sha>`
    - Resolve conflicts if any.
    - Push the branch: `git push origin release/0.3`
4.  **Tagging**:
    - Once backports are applied, a new patch version (e.g., `v0.3.1`) can be tagged from the release branch.
