# Post-Release Verification

This document describes the automated "Post-Release Verification Sweep" that runs immediately after a release tag (`rc-*` or `ga-*`) is created. This process ensures the release is stable and generates a final "Release Complete" evidence artifact.

## Overview

The post-release verification process is a fast, deterministic, and low-flake smoke test suite that runs against the release tag. It does not require any external credentials or live services. The goal is to provide a final validation of the release before it is promoted.

The process is defined in the [`.github/workflows/post-release-verify.yml`](../../.github/workflows/post-release-verify.yml) GitHub Actions workflow.

## Verification Steps

The following steps are performed during the post-release verification:

1.  **Checkout Release Tag**: The workflow checks out the code from the tag that triggered the run.
2.  **Install Dependencies**: It installs all project dependencies using `pnpm install`.
3.  **Run Verification Tests**: A series of minimal, fast, and stable tests are executed:
    *   `pnpm typecheck`: Ensures there are no TypeScript errors.
    *   `pnpm build`: Verifies that the project builds successfully.
    *   `pnpm --filter intelgraph-server test:unit`: Runs server-side unit tests.
    *   `pnpm --filter intelgraph-client test`: Runs client-side tests.
4.  **Generate Evidence**: A script generates a summary of the verification process, including the git ref, SHA, timestamp, and the pass/fail status of the smoke tests. This evidence is captured in two formats:
    *   `summary.md`: A human-readable Markdown file.
    *   `summary.json`: A machine-readable JSON file.
5.  **Upload Artifact**: The generated evidence files are uploaded as a build artifact named `post-release-verify-<ref>`.

## Interpreting Failures

If the post-release verification workflow fails, the release should be considered unstable and should not be promoted. The failure will be indicated in the workflow run logs. To diagnose the failure, inspect the logs for the failing step (e.g., `typecheck`, `build`, or `test:smoke`).

## Rerunning Locally

To rerun the post-release verification sweep locally against a specific tag, follow these steps:

1.  Check out the release tag:
    ```bash
    git checkout <tag-name>
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Run the verification tests:
    ```bash
    pnpm typecheck
    pnpm build
    pnpm --filter intelgraph-server test:unit
    pnpm --filter intelgraph-client test
    ```

If all of these commands pass, the release is considered valid from a verification perspective.
