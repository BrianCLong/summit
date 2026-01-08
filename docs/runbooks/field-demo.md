# Field Demo Operator Runbook

## Overview

The `field:demo` command executes a comprehensive end-to-end test of the offline-first operator workflow. It simulates the entire lifecycle of a field mission, from case pack generation to field data collection, offline edits, conflict resolution, and final evidence bundling.

## Usage

Run the demo locally with a single command:

```bash
pnpm field:demo
```

## What It Proves

This demo verifies the following capabilities:
1.  **Deterministic Case Pack Generation**: Creation of a signed, verifiable package of case data.
2.  **Offline Ingestion**: Importing case packs into a local, isolated store.
3.  **Offline Operations**: Performing CRUD operations (Create, Update, Delete) without network access.
4.  **Conflict Resolution**: Handling concurrent edits from multiple devices using Last-Write-Wins (LWW) with deterministic tie-breaking.
5.  **Sync Convergence**: Ensuring all devices reach the same state after synchronization.
6.  **Evidence Bundling**: Generating a cryptographically verifiable bundle of the entire mission state.

## Artifacts

The demo produces a "Field Evidence Bundle" located in `dist/field-evidence/<runId>/`. The bundle includes:

-   `inputs/`: Seed data used for the run.
-   `casepack/`: The generated case pack manifest and signature.
-   `localstore/`: State dumps and journals from simulated devices (Device A and Device B).
-   `sync/`: Session summaries.
-   `readiness/`: A `field-readiness.json` file indicating PASS/FAIL status.
-   `hashes/`: SHA256 checksums of key artifacts.
-   `bundle/`: A compressed `.tar.gz` archive of the evidence.

## Troubleshooting

### Convergence Failures

If the demo fails with "States did not converge!":
1.  Inspect the logs for "Conflict detected" messages.
2.  Check `dist/field-evidence/<runId>/localstore/device*/conflicts.json` to see how conflicts were resolved.
3.  Ensure that `updatedAt` timestamps are propagating correctly during merges.

### Verification Failures

If pack verification fails:
1.  Check `dist/field-evidence/<runId>/casepack/pack.json`.
2.  Ensure the RSA key pair generation in the script is functioning correctly.

## CI/CD

The `field-demo-e2e` workflow runs this demo on every PR to ensure no regression in offline capabilities.
