# Release Guide: How to Cut vX.Y.Z

This guide describes the process for creating a new point release (e.g., v4.0.1) for Summit MVP-4-GA.

> **See [docs/releases/runbook.md](releases/runbook.md) for the full checklist, gates, and troubleshooting steps.**

## Prerequisites
- Clean git working directory.
- `pnpm` installed.
- Access to push to `main` (or create a PR for the release).

## Steps

### 1. Update CHANGELOG.md
1.  Open `CHANGELOG.md`.
2.  Move the contents of the `[Unreleased]` section to a new section for the current version (e.g., `## [4.0.1] - YYYY-MM-DD`).
3.  Ensure a fresh `[Unreleased]` section exists at the top.
4.  Update links at the bottom of the file (if manually managing links).

### 2. Bump Versions
Update the version number in the following files:
- `package.json` (Root)
- `server/package.json`
- `client/package.json`

Ensure all versions match exactly.

### 3. Sync Dependencies
Run installation to update lockfiles with new versions:
```bash
pnpm install
```

### 4. Verify Release
Run the release verification script to ensure integrity:
```bash
./scripts/verify-release.sh
```
*Note: This script checks for version consistency, artifacts, and runs a typecheck.*

### 5. Commit and Tag
1.  Create a commit:
    ```bash
    git add .
    git commit -m "chore(release): v4.0.1"
    ```
2.  Tag the release:
    ```bash
    git tag v4.0.1
    ```
3.  Push:
    ```bash
    git push origin main --tags
    ```

### 6. CI/CD
The push will trigger the release pipeline (if configured via tags or semantic-release).
