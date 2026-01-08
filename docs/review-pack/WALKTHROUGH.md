# Assessor Walkthrough (60-90 Minutes)

This document provides a scripted walkthrough for an external security or compliance assessor to validate Summit's GA gate, reliability enforcement, and controls-to-evidence traceability.

## Preconditions

Before starting, ensure you have the following installed and configured:
- **Node.js**: v18.x or later
- **pnpm**: v8.x or later
- **Docker**: v20.x or later (for the full GA gate verification)
- **Git**: v2.x or later

Ensure the repository is cloned and you are on the correct commit SHA as specified in `manifest.json`.

Run the following command to install dependencies:
```bash
pnpm install
```

## Walkthrough Steps (10-15 Steps Max)

### Step 1: Run Initial Diagnostics (5 mins)
This script checks for common environment issues.
```bash
./scripts/validate-env.sh
```
**Expected Output:** A series of checks for Docker, Node, pnpm, and other dependencies, ending with "Environment validation successful."

### Step 2: Run the Quick GA Validator (10 mins)
This command runs a series of checks that mirror the CI gate for pull requests. It includes type checking, linting, unit tests, and smoke tests.
```bash
pnpm ga:verify
```
**Expected Output:** A successful exit with no errors. You will see output from the TypeScript compiler, ESLint, and the test runner.

### Step 3: Inspect GA Verification Evidence (5 mins)
The previous command generates artifacts. Let's inspect them.
```bash
ls -l artifacts/ga/
cat artifacts/ga/ga_report.md
```
**Expected Output:** You should see a list of files, including `ga_report.json` and `ga_report.md`. The markdown report will show a summary of the checks that passed.

### Step 4: Trace a Control to its Definition (5 mins)
Let's trace the `SEC-04` (Vulnerability Management) control.
1.  Open `CONTROL_REGISTRY.md` (included in this bundle).
2.  Find the row for `SEC-04`.
3.  Note the description: "Automated scanning of dependencies and container images for known vulnerabilities."

### Step 5: Trace the Control to its Evidence (5 mins)
Now let's find the evidence for `SEC-04`.
1.  Open `EVIDENCE_INDEX.md` (included in this bundle).
2.  Find the row for `SEC-04`.
3.  Note the "Location / Artifact": `.github/workflows/ci-security.yml`.

### Step 6: Verify the Evidence (5 mins)
Let's verify the evidence exists and is correct.
```bash
cat .github/workflows/ci-security.yml | grep "trivy"
```
**Expected Output:** You should see lines containing `trivy`, confirming that the Trivy vulnerability scanner is used in the CI pipeline.

### Step 7: Run Reliability Lints (10 mins)
*(Note: As `docs/ops/RELIABILITY_POLICY.md` was not found, we will substitute with existing governance checks that contribute to reliability.)*

Run the governance and living documents verification scripts. These ensure that critical documentation and policies do not drift from the codebase.
```bash
pnpm verify:governance && pnpm verify:living-documents
```
**Expected Output:** A successful exit with no errors, indicating that all governance checks passed.

### Step 8: Trace a Governance Control (5 mins)
Let's trace `GOV-01` (Code of Conduct).
1.  Open `CONTROL_REGISTRY.md`.
2.  Find `GOV-01`.
3.  Open `EVIDENCE_INDEX.md`.
4.  Find `GOV-01`. Note the evidence is `CODE_OF_CONDUCT.md`.
5.  Verify its existence:
    ```bash
    ls -l CODE_OF_CONDUCT.md
    ```
**Expected Output:** The file `CODE_OF_CONDUCT.md` is listed.

### Step 9: Verify Bundle Integrity (5 mins)
This command will re-calculate the SHA256 hashes of the files in this bundle and you can manually compare them against the `manifest.json`.
```bash
shasum -a 256 ./*
```
**Expected Output:** A list of SHA256 hashes and filenames. Compare these with the `sha256` values in `manifest.json` to ensure they match.

## Restricted Environment (NO_NETWORK_LISTEN)

If you are in an environment where you cannot run services that listen on network ports (e.g., `make ga`), the `pnpm ga:verify` command is designed to run without requiring any network listeners, making it safe for restricted environments. The evidence tracing steps are also safe as they only involve reading files.
