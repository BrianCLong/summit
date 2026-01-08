# Evidence Sampling (Fast Path)

This document provides a "fast path" for assessors to quickly sample evidence and validate the integrity of this review pack. These commands are designed to run in **under 15 minutes**.

## Objective

The goal of this fast path is to:
1.  Verify the integrity of the review pack bundle.
2.  Confirm that key gating mechanisms are in place.
3.  Provide a quick, high-confidence overview of the evidence without running the full test suite.

## Fast Path Commands

### 1. Verify Bundle Integrity (1 min)

This is the most critical step. It ensures that the files in this bundle have not been tampered with since they were generated.

**Command:**
```bash
shasum -a 256 ./*
```

**Instructions:**
- Run the command from within the root of the review pack directory.
- Manually compare the output hashes against the `sha256` values listed in the `manifest.json` file.
- **Expected Outcome:** The hashes for all files (except `manifest.json` itself) should match exactly.

### 2. Check for Vulnerabilities (5-10 mins)

Run a quick dependency vulnerability scan. This is one of the key checks in the `pnpm ga:verify` suite.

**Command:**
```bash
pnpm audit
```

**Instructions:**
- This command checks for known vulnerabilities in the project's dependencies.
- **Expected Outcome:** The command should complete with "No known vulnerabilities" or a list of vulnerabilities that have been accepted and documented.

### 3. Run Lints for Code Quality (2-3 mins)

Run the linter to check for code quality and style issues. This is another key check from the `pnpm ga:verify` suite.

**Command:**
```bash
pnpm lint
```

**Instructions:**
- This command runs ESLint across the codebase.
- **Expected Outcome:** The command should complete with no errors.

### 4. Validate Gating Behavior (NO_NETWORK_LISTEN)

The walkthrough and GA verification process are designed to be run in environments with restricted network access. The `pnpm ga:verify` command does not start any web servers or listen on any ports. This is a key design feature for security and compliance assessments.

**Instructions:**
- You can confirm this by running `pnpm ga:verify` and observing that no network services are started.
- The `manifest.json` also includes the `pnpm ga:verify` command as a key command, indicating it is the primary method for verification in a constrained environment.

## Artifacts to Check

- **`manifest.json`**: This is the most important artifact for the fast path. It is the source of truth for the integrity of the bundle.
- **`ga_report.md` (if `pnpm ga:verify` is run)**: This summary report provides a human-readable overview of the checks that passed. Look for this in `artifacts/ga/`.
- **Log Snippets**: The output of the `pnpm audit` and `pnpm lint` commands are the primary log snippets to check for this fast path. A clean exit (exit code 0) from these commands is the expected outcome.
