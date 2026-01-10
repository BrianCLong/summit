# Golden Path Stabilization & Sprint Execution Plan

## 1. Temporary Guardrail (Effective Immediately)
- **Rule:** No merges that modify test or CI configuration unless they demonstrably improve determinism.
- **Enforcement steps:**
  - Block merges that touch `.github/`, `*.yml`, `jest*`, `turbo.json`, or `pnpm-lock.yaml` unless the PR description lists the determinism gain.
  - Require a **build owner** to confirm reproducibility (CI + local) before approval.
- **State to verify now:** CI green on `main`; designate today’s rotating **build owner**.

## 2. Critical-Path Merge Order
1. **PR #14968 — monorepo bootstrap + CI standardization**
   - Rationale: establishes the baseline runtime/tooling for all follow-on work.
2. **Jest module-system alignment (CJS vs. ESM)**
   - Action: produce a minimal PR choosing one module system and applying it consistently across `jest.config*`, `jest.setup.*`, Node `type` setting, and ts-jest/babel config.
   - Policy: PRs touching Jest stay **draft** until this lands.
3. **PR #14964 — signed SBOM + provenance**
   - Merge after CI standardization to reduce workflow churn.
4. **PR #14970 — health/readiness/status endpoints**
   - Low-risk once the harness is stable.
5. **PR #14963 — Canvas + Worker graph renderer**
   - Largest behavioral change; validate last after the pipeline is reliable.

## 3. Converting “Review X.md” Issues (Today – 60 Minutes)
For each meta “Review …md” issue:
- Create **3–8 concrete tickets** maximum.
- Label each ticket: `P0-Blocker`, `P1-ThisSprint`, or `P2-Later`.
- Assign an owner and explicit acceptance criteria.
- Close the originating meta issue after ticket creation.

## 4. Sprint Artifacts
- **Sprint Goal (1 sentence):** “Stabilize Golden Path CI and ship baseline ops + supply-chain integrity improvements without test regressions.”
- **Sprint Backlog:**
  - **Committed:** #14968, Jest alignment PR, #14964, and the triage outputs above.
  - **Stretch:** #14970, #14963.
- **Definition of Done (additive for this sprint):**
  - No merge that changes the test harness unless CI is green **and** the change is locally reproducible.
  - Any workflow/security change includes explicit rollback notes.

## 5. Kickoff Agenda (30 Minutes, Today)
1. Confirm merge order and assign owners per PR.
2. Identify blockers (signing permissions, CI flakiness, review bandwidth).
3. Set WIP limits: **max 2 active PRs/person**.
4. Assign the **build sheriff** for the next 24 hours.

## 6. Operational Tips
- Run `scripts/check-boundaries.cjs` before opening PRs to avoid unsafe cross-zone changes.
- Keep Golden Path commands green: `make bootstrap && make up && make smoke`.
- Document determinism improvements directly in PR descriptions to satisfy the temporary guardrail.
