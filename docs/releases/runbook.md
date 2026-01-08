# Release Runbook

This is the canonical runbook for operators to perform releases.

> **Quick Links:** See the [Release Bundle Artifacts Index](index.md) for a list of all scripts, workflows, and schemas.

## 1. Overview

- **Artifacts produced:**
  - `dist/release/*` (server and client images/bundles)
  - `release-bundle/compliance-bundle-v*.tgz`
  - `evidence-bundle.tar.gz`
  - `sbom.json`
- **RC vs GA behavior:**
  - RC releases (e.g., `v1.0.0-rc.1`) are marked as "prerelease" in GitHub Releases.
  - GA releases (e.g., `v1.0.0`) are marked as "latest" (unless configured otherwise).

## 2. Before You Tag

1.  **Run release verification scripts:**

    ```bash
    pnpm test:release-scripts
    ```

    _(If the script is present)_

2.  **Run a dry-run (Recommended):**
    Use the `workflow_dispatch` trigger to verify the build and artifact generation without publishing.

3.  **Ensure versions match:**
    Check `package.json` in root, server, and client directories to ensure they match the intended tag.

## 3. How to do a GA cut dry-run

The `GA Release Dry-Run` workflow is a dedicated rehearsal mechanism. It exercises the entire release governance spine—generating the full evidence bundle, sign-off decision, and executive one-pagers—without cutting any real tags or branches.

**Use this process to build confidence and verify the release machinery before a real release.**

1.  **Navigate to the Workflow:**
    - Go to the **Actions** tab in the GitHub repository.
    - In the left sidebar, find and select the **"GA Release Dry-Run"** workflow.

2.  **Run the Workflow:**
    - Click the **"Run workflow"** button.
    - You will be presented with the following inputs:

| Input | Description | Default |
| :--- | :--- | :--- |
| `target` | The branch, tag, or SHA to run against. | `main` |
| `version` | A *mock* version for the rehearsal. | `1.2.3-dryrun` |
| `apply` | **MUST BE `false`**. Setting to `true` will cause the workflow to fail. | `false` |

3.  **Monitor and Review:**
    - The workflow will first trigger the canonical `ga-release.yml` workflow and wait for it to complete. This may take some time.
    - Once the underlying release workflow is finished, the dry-run workflow will download all the produced artifacts.
    - Finally, it will run a script to generate a summary report.

4.  **Check the Artifacts:**
    - When the workflow is complete, go to the run's **"Summary"** page.
    - Under the **"Artifacts"** section, you will find a single zip file named **`dry-run-summary`**.
    - Download and unzip this artifact. It will contain the `DRY_RUN_SUMMARY.md` file.

5.  **Interpret the Results:**
    - Open `DRY_RUN_SUMMARY.md`. This file is the single source of truth for the dry-run.
    - It contains:
        - The exact SHA the dry-run was performed against.
        - The outcome of the sign-off decision (e.g., `ELIGIBLE` or `NOT ELIGIBLE`).
        - A list of all generated evidence bundle reports.
        - Pointers to any missing inputs and instructions on how to fix the underlying process.

## 4. Cut an RC (Release Candidate)

**Tag format:** `vX.Y.Z-rc.N` (e.g., `v0.3.0-rc.1`)

**Command:**

```bash
git tag v0.3.0-rc.1 && git push origin v0.3.0-rc.1
```

**Expected Result:**

- CI pipeline runs.
- GitHub Release created with "Pre-release" checkbox checked.
- Artifacts attached to the release.

## 5. Cut a GA (General Availability)

**Tag format:** `vX.Y.Z` (e.g., `v0.3.0`)

**Command:**

```bash
git tag v0.3.0 && git push origin v0.3.0
```

**Expected Result:**

- CI pipeline runs.
- GitHub Release created as "Latest".
- Artifacts attached to the release.

## 6. Reviewing and Approving Release Evidence

After a release workflow completes, it may generate evidence files in the `/release-evidence/` directory. These files require a formal review and approval via a Pull Request before a release can be finalized.

- **Pull Request Template:** When creating a PR for a new evidence file, you **must** use the `release-evidence` template. This can be selected by adding `?template=release-evidence.md` to the PR creation URL. The template includes a critical checklist for the reviewer.
- **Approval:** Changes to release evidence are governed by `.github/CODEOWNERS`. An explicit approval from the designated owner (`@BrianCLong`) is required to merge.

This governance gate ensures that every release is explicitly verified against key criteria (e.g., matching tag/SHA, non-expired) before it is published.

## 7. Gates & What They Mean

- **Preflight:** Checks branch ancestry and ensures `package.json` version matches the git tag.
- **Freeze:** Checks if the current time falls within a "deployment freeze" window. Requires `override_freeze=true` to bypass.
- **Verify:** Validates checksums (`SHA256SUMS`) and ensures all required files exist in the bundle.
- **Security:**
  - **Canonical Repo Guard:** Ensures release is not running from a fork.
  - **SHA Pinned Actions:** Verifies that GitHub Actions uses immutable SHAs.
- **Idempotency:** Ensures the release process handles "create" (new release) vs "update" (existing release) correctly.

## 7. Troubleshooting

| Error Message                            | Fix                                                                                                          |
| :--------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **"Tag commit not reachable from main"** | Ensure your local branch is up-to-date with `main` and the tag is created on a commit that exists in `main`. |
| **"Version mismatch"**                   | Edit `package.json` (and sub-packages) to match the git tag exactly.                                         |
| **"Frozen window matched"**              | Wait for the freeze window to close, or re-run with `override_freeze=true` if authorized.                    |
| **"SHA256 mismatch"**                    | Regenerate artifacts locally to verify. Ensure no build processes are mutating files after generation.       |
| **"Release already exists"**             | This is expected if re-running a job. The workflow updates the existing release.                             |

## 8. FAQ

- **Why RC doesn’t become latest?**
  - RCs are for testing. Only stable `vX.Y.Z` tags update the "latest" pointer in package managers and GitHub.
- **Where is `SHA256SUMS` used?**
  - It is used by downstream consumers and the `Verify` gate to ensure artifact integrity.
- **How to download artifacts?**
  - Go to the **Releases** page in GitHub and expand the "Assets" section for the specific version.

## 9. Machine-readable outputs

Maestro Conductor and other tools can parse these files from the release artifacts:

- `dist/release/release-summary.json`: High-level success/failure status and metadata.
- `provenance.json`: SLSA provenance data.
- `freeze.json`: Status of the freeze window check.
- `preflight.json`: Results of version and ancestry checks.

Parse these JSON files for automated "go/no-go" decisions.

## 10. Debugging Bundles

To compare two release bundles (e.g., to investigate regressions or verify changes):

```bash
pnpm release:diff -- --a ./dist/release-v1 --b ./dist/release-v2
```

This will output:

- Added/removed files
- Files with changed checksums
- Meaningful JSON differences (ignoring timestamps)
- Schema version warnings
