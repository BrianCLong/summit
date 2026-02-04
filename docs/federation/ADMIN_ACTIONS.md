# Admin Actions

This document outlines the necessary admin actions for the multi-repo governance framework.

## 1. Multi-Repo Access

-   The `sync_policies.ts` and `detect_policy_drift.ts` scripts require read access to all repositories in the ecosystem.
-   A GitHub App or a dedicated service account with read access to all repositories should be created.

## 2. Artifact Retention

-   The `artifacts` directory will grow over time and may need to be pruned periodically.
-   An artifact retention policy should be established to ensure that the `artifacts` directory does not grow indefinitely.

## 3. Token Scopes

-   The GitHub App or service account will require the following token scopes:
    -   `repo:read`: To read the contents of the repositories.
    -   `actions:read`: To read the workflow run metadata.
