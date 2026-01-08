# Stabilization Evidence Capture

This directory contains evidence files for items in the [Issuance Worksheet](../MVP-4_GA_ISSUANCE_WORKSHEET.md).

## Purpose

To ensure that every P0/P1 stabilization item marked as **DONE** has deterministic, auditable evidence. This prevents "claiming completion without proof."

## Workflow

1.  **Identify the Item**: Find your `ISS-###` ID in `docs/releases/MVP-4_GA_ISSUANCE_WORKSHEET.md`.
2.  **Generate Stub**:
    ```bash
    node scripts/releases/stabilization_evidence.mjs create --id ISS-###
    ```
3.  **Fill Evidence**: Edit the generated file (`docs/releases/stabilization-evidence/EVIDENCE_ISS-###.md`).
    *   **Verification**: Paste exact commands ran and their output (or a summary).
    *   **Artifacts**: Link to generated artifacts or CI logs.
    *   **Result**: Change `FAIL` to `PASS` and update the date.
4.  **Link in Tracker**: Update the "Evidence Link" column in `MVP-4_GA_ISSUANCE_WORKSHEET.md` with the relative path (e.g., `stabilization-evidence/EVIDENCE_ISS-###.md`).
5.  **Validate**:
    ```bash
    node scripts/releases/stabilization_evidence.mjs validate
    ```

## Acceptable Evidence

*   **Deterministic**: `make smoke` output showing "ALL TESTS PASSED".
*   **Traceable**: Links to GitHub Actions runs or uploaded artifact URLs.
*   **Reproducible**: Instructions on how to re-run the verification.

## Unacceptable Evidence

*   "It works on my machine" (without logs).
*   "Verified in Slack" (without a link/snapshot).
*   Empty files or files marked `FAIL`.

## CI Integration

The `validate` command runs in CI. If you mark an item as `DONE` but fail to provide a valid, passing evidence file linked in the worksheet, the build will fail (or produce a warning in non-release branches).
