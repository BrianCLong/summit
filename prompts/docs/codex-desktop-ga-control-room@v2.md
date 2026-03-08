# Codex Desktop GA Control Room + Architecture Lab Setup (v2)

## Goal
Stand up Codex Desktop project artifacts for the Summit GA Control Room and Summit Architecture Lab, plus evidence-first run outputs with UEF structure and MAESTRO alignment.

## Required Outputs
- `docs/codex-desktop/summit-ga-control-room.md`
- `docs/codex-desktop/ga-control-room-run-YYYY-MM-DD.md`
- `docs/codex-desktop/summit-architecture-lab.md`
- Update `docs/roadmap/STATUS.json` with initiative notes.
- Record a DecisionLedger entry in `packages/decision-ledger/decision_ledger.json`.

## Constraints
- Evidence-first output with explicit **UEF / Sensing** and **UEF / Reasoning** sections.
- Include **MAESTRO Layers / Threats / Mitigations** in each project/run artifact.
- Mark any missing data as **“Deferred pending X”** or **“Intentionally constrained.”**
- Rebrand missing external access as **Governed Exceptions** with owners.
- Use non-GA-blocking posture for Architecture Lab.
- Maintain conventional commit messaging.

## Verification
- Run `node scripts/check-boundaries.cjs`.
