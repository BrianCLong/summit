# GA Integrity Budgets

**Owner:** Release Captain (Jules)
**Enforcement:** `scripts/ci/check_integrity_budgets.ts`
**Config:** `config/integrity-budgets.json`

This document defines the hard constraints (budgets) for the General Availability (GA) release. These budgets prevent regression in quality, performance, and maintainability. They are enforced by local scripts that must pass before any release candidate is cut.

## The Budgets

### 1. Repo Hygiene Budget
*   **Limit:** **0** untracked files in source directories (`server/src`, `client/src`, etc.).
*   **Why:** Untracked files lead to "it works on my machine" bugs and unreproducible builds.
*   **Measurement:** `git status --porcelain <paths>` must be empty.
*   **Threshold:** 0 files.

### 2. Dependency Count Budget
*   **Limit:** Max **60** production dependencies in root `package.json`.
*   **Why:** Prevents bloat, supply chain attack surface expansion, and slow install times.
*   **Measurement:** Count keys in `dependencies`.
*   **Threshold:** 60.

### 3. Lint Suppression Budget
*   **Limit:** Max **2200** instances of broad suppressions (`eslint-disable` or `@ts-ignore`).
*   **Why:** Suppressions hide bugs and technical debt. They should be rare and specific, not broad.
*   **Measurement:** `grep -r "eslint-disable" .` and `grep -r "@ts-ignore" .` (excluding node_modules/dist).
*   **Threshold:** 2200.

### 4. Technical Debt (TODO) Budget
*   **Limit:** Max **160** `TODO` markers in `server/src`.
*   **Why:** Accumulating TODOs in core server code indicates unfinished features or known fragility.
*   **Measurement:** `grep -r "TODO" server/src | wc -l`.
*   **Threshold:** 160.

### 5. Test Skip Budget
*   **Limit:** Max **90** skipped tests in `server/tests` or `tests/`.
*   **Why:** Skipped tests are often forgotten broken functionality.
*   **Measurement:** `grep -r ".skip" server/tests tests | wc -l`.
*   **Threshold:** 90.

### 6. Verification Speed Budget
*   **Limit:** Budget checker must complete in **< 10 seconds**.
*   **Why:** Slow checks are disabled or ignored. Velocity is safety.
*   **Measurement:** Internal timer in the budget checker script.
*   **Threshold:** 10000 ms.

## Overrides
Overrides are only granted by the Release Captain with a documented risk acceptance record in `docs/ops/RISK_ACCEPTANCE.md`.
