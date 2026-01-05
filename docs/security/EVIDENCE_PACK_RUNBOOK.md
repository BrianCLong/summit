# Security Evidence Pack Runbook

This runbook describes how to generate, verify, and maintain the Security Evidence Pack for Summit.

## Overview

The Security Evidence Pack is a deterministic, time-stamped bundle of all key security artifacts (policies, risk ledgers, compliance docs) and verification reports (static analysis, baseline checks). It serves as the "ground truth" for the system's security posture at any given point in time.

## Quick Start

### 1. Generate a New Evidence Pack (Live)

Run this command to collect the current state of the repo and run verification checks:

```bash
pnpm security:evidence-pack
```

**Output:** `evidence/security/<YYYYMMDD-HHMMSS>/`

The pack contains:
*   `INDEX.md`: Human-readable summary and file inventory.
*   `index.json`: Machine-readable inventory with SHA256 hashes.
*   `environment.json`: Execution context (commit SHA, node version).
*   `artifacts/`: Recursive copy of collected documents.
*   `outputs/`: Raw output from verification commands.

### 2. Check for Drift

To ensure the documentation matches the code and no silent changes have occurred:

```bash
pnpm security:drift-check
```

This compares the current file hashes against the *latest* existing evidence pack. If they differ, it exits with an error.

## What is Collected?

The evidence pack automatically includes:

*   **Root Policy**: `SECURITY.md`, `CODEOWNERS`, `.github/dependabot.yml`
*   **Compliance Docs**: `docs/compliance/`
*   **Risk Registers**: `docs/risk/`
*   **Operational Specs**: `docs/ops/`
*   **Invariants**: `invariants/`
*   **OPA Policies**: `policy/`, `policies/`

It also executes and captures:
*   `scripts/security/baseline-check.sh`: Verifies existence of required controls.
*   `scripts/security/scan-tenant-isolation.ts`: Scans codebase for multi-tenancy violations.

## CI Integration

To prevent drift, the following check should be added to the CI pipeline (e.g., in a "Security" or "Compliance" stage):

```yaml
- name: Verify Security Evidence
  run: pnpm security:drift-check
```

If this fails, the PR author must run `pnpm security:evidence-pack` locally and commit the new evidence bundle.

## Extending the Pack

To add a new artifact or command:

1.  Edit `scripts/security/evidence-pack.ts`.
2.  Add the file path to `ARTIFACTS_TO_COLLECT` or the command to the execution phase.
3.  Ensure the command is safe (no network/creds) and deterministic.
4.  Run `pnpm security:evidence-pack` to verify.

## Troubleshooting

*   **Drift Check Failed**: You modified a security doc. Run `pnpm security:evidence-pack` and commit the result.
*   **Missing Artifact**: If a file listed in `ARTIFACTS_TO_COLLECT` is missing, the script will log a warning but continue. Ensure the file exists if it is mandatory.
