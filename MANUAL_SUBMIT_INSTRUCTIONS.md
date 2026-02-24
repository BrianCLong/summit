# Manual Submission Instructions

The implementation for "Narrative IO Inference & Convergence" is complete on branch `jules-3550572952198695495-7075da1f`.

## Changes Summary
1.  **Core Feature**: Implemented `src/narrative` with submodules (inference, redundancy, convergence, identity).
2.  **Tests**: Verified `tests/narrative` passes.
3.  **CI Fixes**:
    - Fixed `package.json` (test:security).
    - Fixed `.github/workflows/pr-gates.yml` (helm lint path, pnpm setup, v4 actions).
    - Fixed `.github/workflows/ux-governance.yml`.
    - Upgraded actions to v4 across codebase.
4.  **Documentation**: Created required docs in `docs/`.
5.  **Monitoring**: Added `scripts/monitoring/narrative-io-inference-convergence-drift.ts`.
6.  **CI Workflow**: Added `.github/workflows/ci-narrative-io.yml`.

## How to Submit
Please push the branch `jules-3550572952198695495-7075da1f` to origin and create a Pull Request with title "feat(narrative): Narrative IO Inference & Convergence".
