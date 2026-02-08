# Codex Desktop GA Control Room + Architecture Lab Setup (v1)

## Goal
Stand up Codex Desktop project artifacts for the Summit GA Control Room and Summit Architecture Lab, plus a first-run evidence output for GA threads.

## Required Outputs
- `docs/codex-desktop/summit-ga-control-room.md`
- `docs/codex-desktop/ga-control-room-run-YYYY-MM-DD.md`
- `docs/codex-desktop/summit-architecture-lab.md`
- Update `docs/roadmap/STATUS.json` with initiative notes.
- Record a DecisionLedger entry in `packages/decision-ledger/decision_ledger.json`.

## Constraints
- Evidence-first output; cite canonical trackers and GA gate artifacts.
- Use non-GA-blocking posture for Architecture Lab.
- Maintain conventional commit messaging.

## Verification
- Run `node scripts/check-boundaries.cjs`.
