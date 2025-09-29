# Sprint 15 Test Plan

## Case Flows
- Create case from alert and verify timeline entries.
- Add evidence; confirm SHA-256 hash recorded.

## Approvals & Dry-Run
- Execute playbook in dry-run; ensure no external mutation.
- Approve playbook step and verify action executed.

## Evidence Hashing
- Tamper with stored file and expect hash mismatch.

## DSAR on Case Exports
- Export case; request purge via script.
