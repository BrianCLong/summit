# Spec-to-Code Traceability

This document maintains a lightweight mapping between key feature specifications, their implementation, and verification tests.

## Tagging Convention

- **Format**: `F-<FEATURE-NAME>-<SEQUENCE>`
- **Usage**:
    - **Docs**: Add `Feature ID: F-NAME-001` to the header or relevant section of the spec.
    - **Code**: Add `// F-NAME-001` or `# F-NAME-001` comments near the core logic or class definition.
    - **Tests**: Add `// F-NAME-001` or `# F-NAME-001` comments near the test case or suite.

## Traceability Matrix

| Feature ID | Feature Name | Specification | Implementation | Verification (Tests) |
| :--- | :--- | :--- | :--- | :--- |
| `F-NARRATIVE-SIM-001` | Narrative Simulation Engine | `docs/narrative-sim-summary.md` | `server/src/narrative/engine.ts` | `server/src/narrative/engine.test.ts` (inferred) |
| `F-PROV-LEDGER-001` | Provenance Ledger Service | `docs/prov-ledger.md` | `prov-ledger/` | `prov-ledger/tests/test_main.py` |
| `F-GOLDEN-PATH-001` | Golden Path User Journey | `docs/GOLDEN_PATH.md` | `scripts/smoke-test.js` | `scripts/smoke-test.js`, `k6/golden-path.js` |
| `F-DISASTER-RECOVERY-001` | Point-in-Time Recovery (PITR) | `docs/dr/pitr_playbook.md` | `scripts/backup/`, `scripts/restore/` | `scripts/dr_drill.sh` |

## Feature Details

### F-NARRATIVE-SIM-001: Narrative Simulation Engine
- **Spec**: `docs/narrative-sim-summary.md` defines the engine's purpose, inputs (entities, events), and outputs (narrative state, sentiment).
- **Code**: `server/src/narrative/engine.ts` implements the `NarrativeSimulationEngine` class, including the `tick()` loop and `applyEvent()` logic.
- **Tests**: Verified via `npm test` focusing on the narrative module.

### F-PROV-LEDGER-001: Provenance Ledger
- **Spec**: `docs/prov-ledger.md` outlines the API for registering evidence, emitting claims, and exporting bundles.
- **Code**: The `prov-ledger/` directory contains the Python FastAPI service.
- **Tests**: `prov-ledger/tests/test_main.py` contains the unit and integration tests for the endpoints.

### F-GOLDEN-PATH-001: Golden Path
- **Spec**: `docs/GOLDEN_PATH.md` (and `scripts/smoke-test.js`) describes the critical user journey.
- **Code**: The logic is distributed across the stack, but `scripts/smoke-test.js` acts as the codified requirement.
- **Tests**: `scripts/smoke-test.js` runs the actual verification against a running stack. `k6/golden-path.js` benchmarks it.

### F-DISASTER-RECOVERY-001: PITR
- **Spec**: `docs/dr/pitr_playbook.md` describes the steps for restoration.
- **Code**: Scripts in `scripts/backup/` and `scripts/restore/` (or `scripts/restore.sh`, `scripts/backup.sh`).
- **Tests**: `scripts/dr_drill.sh` (found in file list) likely automates the drill described in the playbook.
