# UI Spec: Recon Kill Audit View (QSDR)

## Purpose

Display kill-switch events and supporting evidence for recon modules.

## Layout

- **Kill Event Summary:** module ID, reason, policy decision.
- **Evidence Panel:** canary triggers, query-shape violations.
- **Replay Panel:** determinism token and module version set.

## UX Requirements

- Provide exportable audit bundle.
- Highlight modules under quarantine.
