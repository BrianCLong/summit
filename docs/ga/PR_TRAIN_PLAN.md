# GA PR Train Plan (Atomic)

**Mode:** Reasoning.  
**Authority Anchors:** Constitution + Meta-Governance + Agent Mandates + GA guardrails.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Tools, Observability, Security.
- **Threats Considered:** gate bypass, evidence gaps, tool misuse, non-deterministic test behavior.
- **Mitigations:** atomic PRs, deterministic scripts, evidence bundles, rollback notes per PR.

## PR Train (Ordered)


### PR-0 — docs(ga): capture recature state + backlog
- **Touched paths:** `docs/ga/`, `docs/roadmap/STATUS.json`, `evidence/ga-recature/`, `evidence/ga-recapture/`
 HEAD
### PR-0 — docs(ga): capture recapture state + backlog
- **Touched paths:** `docs/ga/`, `docs/roadmap/STATUS.json`, `evidence/ga-recapture/`
 origin/main
- **Acceptance checks:** `make ga-verify`, `scripts/check-boundaries.cjs`
- **Evidence bundle checklist:** phase 0/1 logs + command inventory
- **Rollback plan:** revert doc and evidence files


### PR-1 — fix(workflow-engine): restore Jest setup for tests
 HEAD
### PR-1 — docs(ga): align verification map with Tier B coverage
- **Touched paths:** `docs/ga/verification-map.json`, `docs/ga/MVP-4-GA-VERIFICATION.md`
- **Acceptance checks:** `make ga-verify`
- **Evidence bundle checklist:** ga-verify output + map diff
- **Rollback plan:** revert verification map updates
### PR-2 — fix(workflow-engine): restore Jest setup for tests
 origin/main

- **Touched paths:** `apps/workflow-engine/**`
- **Acceptance checks:** `pnpm --filter @intelgraph/workflow-engine test`, `pnpm -r test`
- **Evidence bundle checklist:** command logs + updated Jest config
- **Rollback plan:** revert Jest setup file/config


### PR-2 — chore(ga): ensure GA lint path has venv bootstrap or python fallback
 HEAD
### PR-3 — chore(ga): ensure GA lint path has venv bootstrap or python fallback
 origin/main

- **Touched paths:** `Makefile`, `scripts/ga-gate.sh` (if needed)
- **Acceptance checks:** `make ga` (or `make ga-verify` if scoped)
- **Evidence bundle checklist:** GA gate logs with venv creation evidence
- **Rollback plan:** revert GA gate change


### PR-3 — chore(ci): restore ci:parity / ci:verify scripts or adjust gate mapping
 HEAD
### PR-4 — chore(ci): restore ci:parity / ci:verify scripts or adjust gate mapping
 origin/main

- **Touched paths:** `package.json`, `docs/ga/` (if mapping updated)
- **Acceptance checks:** `pnpm ci:parity`, `pnpm ci:verify`
- **Evidence bundle checklist:** command logs + script definition diff
- **Rollback plan:** revert scripts/mapping change


### PR-4 — fix(lint): resolve ruff import ordering + eslint warnings
 HEAD
### PR-5 — fix(lint): resolve ruff import ordering + eslint warnings
 origin/main

- **Touched paths:** targeted lint offenders in `contracts/` and `evals/`
- **Acceptance checks:** `pnpm -w exec eslint .`, `python -m ruff check .`
- **Evidence bundle checklist:** lint outputs pre/post
- **Rollback plan:** revert lint fixes


### PR-5 — docs(ga): align verification map with Tier B coverage
- **Touched paths:** `docs/ga/verification-map.json`, `docs/ga/MVP-4-GA-VERIFICATION.md`
- **Acceptance checks:** `make ga-verify`
- **Evidence bundle checklist:** ga-verify output + map diff
- **Rollback plan:** revert verification map updates
 HEAD
 origin/main

## Rollup Guardrails

- Each PR is reversible and evidence-backed.
- No policy bypasses or gate weakening without a governed exception record.

**End State:** Ordered atomic train ready for execution; no open ends.
