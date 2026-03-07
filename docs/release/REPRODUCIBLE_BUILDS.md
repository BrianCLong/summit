# Reproducible Builds Sanity Check

This document describes the reproducible builds sanity check implemented for the IntelGraph platform.

## Purpose

The goal of this check is to ensure that our build process is deterministic. If we build the same source code twice, we should get bit-for-bit identical output. This is a crucial security property for supply chain integrity.

## How it works

The `scripts/repro-check.sh` script performs the following steps:

1.  Creates two temporary directories.
2.  Runs the client build (`pnpm run build` inside `client/`) targeting the first temporary directory.
3.  Runs the client build again targeting the second temporary directory.
4.  Calculates SHA256 hashes of all files in both output directories using a cross-platform Node.js script.
5.  Compares the hashes.

If the hashes match, the build is considered reproducible. If not, the script fails and outputs the diff.

## Running the check

You can run the check manually from the root of the repository:

```bash
./scripts/repro-check.sh
```

## CI Integration

This check is integrated into our CI pipeline via GitHub Actions. It runs on every pull request and push to main.

Currently, the CI step is configured in "warn-only" mode. This means that if the reproducibility check fails, the CI job will still pass, but a warning will be logged. This allows us to gather data on build stability without blocking development.

Note: The CI job currently uses `pnpm install --no-frozen-lockfile` temporarily because the repository lockfile is currently out-of-sync; this is acceptable as the check is intentionally non-blocking while reproducibility is evaluated.

## Troubleshooting

If the check fails:

1.  Check the diff output to see which files differ.
2.  Look for timestamps, random seeds, or absolute paths embedded in the build artifacts.
3.  Ensure that tools like `vite` are configured to produce deterministic output (e.g., consistent file hashing).
