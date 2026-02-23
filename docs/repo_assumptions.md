# Repo Assumptions & Verification

**Verified:**
*   Monorepo structure with `services/` and `src/`.
*   `src/` contains core logic and libraries (`intelgraph`, `maestro`, `memory`, etc.).
*   `services/evals` exists but only contains `runner.ts`.
*   `src/evals` does NOT exist (will be created).
*   TypeScript environment.
*   `src/cli` exists.

**Assumed:**
*   We can add shared evaluation logic to `src/evals`.
*   Test runner is Jest or similar (implied by `jest.globalSetup.js` in root).

**Plan Deviation:**
*   Instead of putting everything in `services/evals`, we are creating a shared library in `src/evals` to be used by services.
