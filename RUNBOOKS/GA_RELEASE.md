# Runbook: General Availability (GA) Release

This document outlines the process for creating a General Availability (GA) release for the Summit platform. The process is designed to be deterministic, policy-aligned, and automated to ensure the integrity and provenance of our releases.

## Table of Contents

- [Cutting a Release Locally (Manual Tagging)](#cutting-a-release-locally-manual-tagging)
- [CI Release Workflow](#ci-release-workflow)
- [Rollback Guidance](#rollback-guidance)
- [Release Artifacts](#release-artifacts)

---

## Cutting a Release Locally (Manual Tagging)

While the CI/CD pipeline automates the release process, you can create a GA tag locally if needed. The `ga-tag.ts` script ensures that all necessary validation checks are performed before a tag is created.

### Prerequisites

- You must be on the `main` branch.
- Your git working directory must be clean (no uncommitted changes).

### Usage

To create a new GA tag, run the following command from the root of the repository:

```bash
pnpm exec tsx scripts/release/ga-tag.ts <version>
```

Replace `<version>` with a valid semantic version (e.g., `1.2.3` or `v1.2.3`). The script will automatically normalize the version to the `vX.Y.Z` format.

### Dry Run

To perform a validation check without actually creating a tag, use the `--dry-run` flag:

```bash
pnpm exec tsx scripts/release/ga-tag.ts <version> --dry-run
```

This will run all the checks and report any errors, but it will not create a tag or push to the repository.

### Pushing the Tag

After the script successfully creates the tag, you must push it to the remote repository to trigger the CI release workflow:

```bash
git push origin --tags
```

---

## CI Release Workflow

The CI release workflow is defined in `.github/workflows/ga-release-automation.yml`. It is triggered automatically when a new tag matching the `v*.*.*` pattern is pushed to the repository. It can also be triggered manually through the GitHub Actions UI.

### Workflow Steps

1.  **Checkout & Setup:** The workflow checks out the code and sets up the Node.js and pnpm environment.
2.  **Install Dependencies:** It installs all the required dependencies using `pnpm install --frozen-lockfile`.
3.  **Run GA Gate Tests:** A subset of critical tests are run to ensure the release is stable.
4.  **Build Artifacts:** The `pnpm build` command is executed to create the server and client builds.
5.  **Prepare Artifacts:** The build outputs are consolidated into a single `release-artifacts/` directory.
6.  **Generate Checksums:** SHA256 checksums are generated for all the artifacts in the `dist/` directory.
7.  **Generate SBOM:** A Software Bill of Materials (SBOM) is generated using `syft` in CycloneDX format.
8.  **Generate SLSA Provenance:** A SLSA-compliant provenance attestation is generated for the release artifacts.
9.  **Create GitHub Release:** A new GitHub Release is created, and all the artifacts, checksums, SBOM, and provenance are uploaded.

---

## Rollback Guidance

If a bad release is created, you can roll it back by following these steps:

1.  **Delete the remote tag:**

    ```bash
    git push --delete origin <tag-name>
    ```

2.  **Delete the local tag:**

    ```bash
    git tag -d <tag-name>
    ```

3.  **Delete the GitHub Release:**
    - Navigate to the "Releases" page in the GitHub repository.
    - Find the release corresponding to the tag you deleted.
    - Click the "Delete" button and follow the instructions.

4.  **Communicate the rollback:**
    - Notify the team that the release has been rolled back.
    - If the release was made public, mark it as "yanked" or "retracted" in any relevant communications.

---

## Release Artifacts

The GA release workflow produces the following artifacts, which are attached to the GitHub Release:

- **Build Artifacts:** The compiled server and client code, located in the `dist/` directory.
- **Checksums:** A `checksums.txt` file containing the SHA256 checksums of all the build artifacts.
- **SBOM:** A `sbom.json` file in CycloneDX format, detailing all the software components in the release.
- **SLSA Provenance:** A `provenance.json` file that provides a verifiable chain of custody for the release artifacts.

These artifacts ensure that every release is verifiable, transparent, and compliant with our security and supply chain integrity policies.
