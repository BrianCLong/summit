# Branch Protection Rules for `main`

This document outlines the required branch protection rules for the `main` branch to enforce the release train and quality gates.

- **Require a pull request before merging**: Enabled
  - **Require approvals**: 1
  - **Dismiss stale pull request approvals when new commits are pushed**: Enabled

- **Require status checks to pass before merging**: Enabled
  - **Require branches to be up to date before merging**: Enabled
  - **Status checks that are required**:
    - `quality-gates`
    - `chaos-test`

- **Require conversation resolution before merging**: Enabled

- **Require linear history**: Enabled

- **Require signed commits**: Enabled
