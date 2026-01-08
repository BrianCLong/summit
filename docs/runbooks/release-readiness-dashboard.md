# Runbook: Release Readiness Dashboard

## 1. Overview

This runbook provides guidance on accessing, interpreting, and regenerating the Release Readiness Dashboard. The dashboard is a centralized report that summarizes the state of a given build, providing a clear "READY" or "NOT READY" signal for release.

## 2. Accessing the Dashboard

The Release Readiness Dashboard is generated as a CI artifact in the `release-readiness` workflow on every `pull_request` and `push` to the `main` branch.

To find the dashboard:

1.  Navigate to the "Actions" tab of the GitHub repository.
2.  Select the `Release Readiness Gate` workflow run you are interested in.
3.  In the "Artifacts" section of the summary page, you will find a `release-readiness-dashboard` artifact.
4.  Download and unzip the artifact. It will contain `index.html`, `index.md`, and `readiness.json`.

## 3. Interpreting the Dashboard

The dashboard provides a high-level summary of the release readiness, along with detailed sections for each aspect of the verification process.

### 3.1. Overall Status

The most important part of the dashboard is the overall status:

-   **`READY`**: All required gates have passed, and there are no blocking issues. The build is considered safe to release.
-   **`NOT READY`**: One or more required gates have failed, or there are blocking issues. The build is **not** safe to release.
-   **`UNKNOWN`**: The status could not be determined. This may indicate an error in the dashboard generation process itself.

The "Blocking Reasons" section will provide a list of specific issues that are preventing the build from being `READY`.

## 4. Regenerating the Dashboard Locally

To regenerate the dashboard locally, you will need to first download the artifacts from the CI run.

1.  Download the `ga-report` and `release-readiness-report` artifacts from the desired workflow run.
2.  Create a directory named `artifacts` in the root of the repository.
3.  Unzip the downloaded artifacts into the `artifacts` directory, preserving the directory structure. For example, you should have a `artifacts/ga/ga_snapshot.json` file.
4.  Run the following command from the root of the repository:

    ```bash
    pnpm tsx scripts/ci/build_release_readiness_dashboard.ts
    ```

5.  The dashboard will be generated in the `dist/readiness` directory.
