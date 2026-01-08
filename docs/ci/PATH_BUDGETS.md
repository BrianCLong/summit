# Path Length Budgets & Policy

To prevent build failures caused by `ENAMETOOLONG` errors (common in Docker builds, tar/zip packaging, and Windows environments), we enforce strict "path budgets" for file paths in the repository and generated artifacts.

## Why Budgets?

*   **Docker Build Context:** `docker build` can fail if the build context contains paths exceeding certain limits (often around 255 chars, or total path length limits in the engine).
*   **Artifact Packaging:** Creating tarballs or zip files can fail if internal paths are too long.
*   **Operating System Limits:** Windows has a 260 character limit (MAX_PATH) unless specifically configured, which affects contributors and CI runners.

## The Policy

Path budgets are defined in `release-policy.yml`.

| Intent | Max Path Chars | Max Depth | Fail on Violation? |
| :--- | :--- | :--- | :--- |
| **Normal** | 220 | 18 | No (Warning only) |
| **Release Intent** | 200 | 16 | **Yes** |

**Scopes:**
*   Repo workspace (`.`)
*   `artifacts/`
*   `server/dist/`
*   `web/dist/`

**Excludes:**
*   `node_modules`
*   `.git`
*   `.pnpm-store`
*   `.turbo`
*   `playwright/.cache`

## Workflow Integration

*   **Release Gate:** Runs with `--release-intent`. Fails if any path exceeds the Release Intent budget.
*   **Docker Build:** Runs in Normal mode (warn only) on PRs/pushes, but provides visibility into potential issues before the build context is sent to the daemon.

## How to Fix Violations

If you encounter a violation in the report (`artifacts/path-budget/report.md`):

1.  **Check the Offender:** Look at the "Top Offenders" list.
2.  **Determine Root Cause:**
    *   **Deep nesting:** Are you nesting build artifacts inside other artifacts? (e.g., `dist/dist/dist`)
    *   **Long filenames:** Are generated files using verbose naming conventions? (e.g. `PlatformTool-Category-...csv`)
    *   **Test Snapshots:** Automated test snapshots can sometimes generate very deep/long paths.
3.  **Remediation:**
    *   **Shorten Checkout:** Use `path: r` or similar short paths in CI checkouts.
    *   **Flatten Structure:** Move generated artifacts up a level.
    *   **Rename:** Rename long files or directories.
    *   **Exclude:** If the deep path is not needed for the release artifact, exclude it from the build output.

## Reports

Each run generates:
*   `report.json`: Full machine-readable data.
*   `report.md`: Human-readable summary with top 50 longest/deepest paths and remediation guidance.
