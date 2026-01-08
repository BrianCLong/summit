# Artifact Size Budgets

To ensure CI stability, prevent storage exhaustion, and keep evidence reviewable, we enforce budgets on the size and count of build artifacts.

## Policy

Budgets are defined in `release-policy.yml` under `artifact_budgets`.

### Current Budgets (Default)

| Profile | Max Total MB | Max Files | Per-Section Limits |
| :--- | :--- | :--- | :--- |
| **Normal (PRs)** | 200 MB | 5000 | 50MB (evidence, test_reports, coverage, media) |
| **Release Intent** | 150 MB | 3000 | Custom per section (see policy) |

### Exclusions

The following patterns are automatically excluded from the inventory:
- `**/node_modules/**`
- `**/.pnpm-store/**`
- `**/.turbo/**`
- `**/.cache/**`
- `**/playwright-report/**/trace.zip`

## Enforcement

Artifact budgets are enforced during the CI process.

1.  **Inventory**: A script scans the `artifacts/` directory and generates a report (`report.json`, `report.md`).
2.  **Enforcement**: A script compares the inventory against the policy.
    *   **Normal PRs**: Violations result in a warning.
    *   **Release Intent**: Violations result in a build failure.

**Important:** The per-section budgets rely on the top-level directory names in the `artifacts/` folder matching the policy keys (e.g., `artifacts/evidence` matches the `evidence` section). Ensure your build scripts output artifacts to correctly named subdirectories.

## Troubleshooting Failures

If your build fails due to artifact budget violations:

1.  **Check the Report**: Look at the CI summary or the `artifacts/artifact-budget/report.md` artifact.
2.  **Identify Large Files**: The report lists the top 20 largest files.
3.  **Reduce Size**:
    *   **Trim Logs**: Ensure logs are rotated or tail-capped.
    *   **Compress Media**: Use lower resolution or frame rates for test recordings.
    *   **Exclude Unnecessary Files**: Add specific exclusions to `release-policy.yml` if the files are not critical evidence.
    *   **Split Artifacts**: If possible, split large evidence packs into smaller chunks.

## How to Adjust

To modify budgets (e.g., increase the limit for a specific project), edit `release-policy.yml`.
**Note:** Increases to release budgets require approval.
