# Summit Architecture Lab

## Mission

Establish a governed, parallel architecture laboratory for the Summit/IntelGraph repo that focuses on **agentic orchestration** and **frontend evolution** with strict evidence-first outputs and human-reviewed merges.

## Canonical Repository

- **Repo:** `~/src/summit` (authoritative source of truth)
- **Worktree root:** `/workspace/summit/_worktrees`
- **Default main branch posture:** protected `main`, no direct agent commits

## Operating Model (Codex Desktop)

1. Spawn one thread per architecture lane (Frontend, Agentic, Testing, Docs).
2. Bind each thread to a dedicated worktree + branch namespace.
3. Run analysis first; only propose surgical diffs with rollback plans.
4. Promote to PR only when scope, risk, and evidence satisfy governance gates.

## Thread Map (Codex Desktop)

### 1) Frontend Architecture

**Goal:** Map the current web frontend structure, identify reusable UI/UX seams, and define a governed React-first architecture baseline with Angular-pattern experimentation isolated in lab branches.

**Default skills to load:**
- `angular-component` (standalone component patterns)
- `summit-pr-stack-sequencer` (merge safety)
- `summit-ga-preflight-hard-gate-auditor` (governance readiness)

**Primary questions:**
- What are the stable surfaces for investigation/graph/tri-pane views?
- Which components qualify as shared primitives vs. feature-owned?

**Primary deliverables:**
- `docs/architecture/frontend-overview.md`
- Candidate shared shell contract (`keep/change/extract`)

### 2) Agentic Patterns

**Goal:** Inventory current agent integration points, formal contracts, and governance gates; propose safely reversible experiments.

**Default skills to load:**
- `summit-pr-stack-sequencer`
- `summit-ga-preflight-hard-gate-auditor`

**Primary questions:**
- Where are mandates, integration gateways, and provenance enforced today?
- Which seams need stronger contracts or evidence hooks?

**Primary deliverables:**
- `docs/architecture/agentic-seams.md`
- Proposal list for contract-first, rollback-safe experiments

### 3) Testing & Playwright

**Goal:** Harden deterministic UI verification and smoke-test coverage for architecture changes.

**Default skills to load:**
- `summit-ga-preflight-hard-gate-auditor`
- `summit-pr-stack-sequencer`

**Primary questions:**
- Which golden-path routes need regression coverage before refactors?
- Where can test harnesses be standardized across feature shells?

**Primary deliverables:**
- Smoke coverage plan for workbench and graph seams
- Flake-risk register for architecture experiments

### 4) Docs & Diagrams

**Goal:** Keep architecture maps current with evidence-first updates and single-source authority alignment.

**Default skills to load:**
- `summit-pr-stack-sequencer`

**Primary questions:**
- Which documents are the authority source for each architectural claim?
- Where should diagrams be updated to match current structure?

**Primary deliverables:**
- Architecture decision deltas and evidence-linked diagrams
- Authority map for each architectural assertion

## Worktree / Sandbox Policy

All architecture experiments **must** run in isolated worktrees under `/workspace/summit/_worktrees`. Never commit directly to `main`.

**Naming conventions:**
- `arch/frontend-layout-<topic>`
- `arch/agentic-boundaries-<topic>`
- `arch/testing-harness-<topic>`
- `arch/docs-diagrams-<topic>`

**Worktree lifecycle commands:**
```bash
# create
git worktree add _worktrees/arch-frontend-layout-investigation-shell -b arch/frontend-layout-investigation-shell

# sync with main before opening PR
git -C _worktrees/arch-frontend-layout-investigation-shell fetch origin
git -C _worktrees/arch-frontend-layout-investigation-shell rebase origin/main

# remove after merge or disposal
git worktree remove _worktrees/arch-frontend-layout-investigation-shell
git branch -D arch/frontend-layout-investigation-shell
```

**PR eligibility rules:**
- **Allowed PRs:** documentation-only changes, isolated refactors with explicit rollback plans, or tests that preserve existing behavior.
- **Experiment-only branches:** anything that alters runtime behavior or policy gates until a human approves scope and risk.
- **Evidence gate:** every PR must link to a roadmap item in `docs/roadmap/STATUS.json` and include an evidence-first summary.

**Promotion gate checklist (must be true to open PR):**
- Scope limited to one primary zone or declared strictly-coupled change.
- Rollback path is explicit and reversible.
- `scripts/check-boundaries.cjs` passes.
- Prompt/task metadata stays consistent with `prompts/registry.yaml` and `agents/task-spec.schema.json`.

## Architecture Experiments (Proposal Only)

### Experiment A: `arch/frontend-layout-investigation-shell`

- **Objective:** Standardize the Investigation view shell (layout, toolbar, filters) into a reusable primitive.
- **Scope:** UI shell composition only; no data contract changes.
- **Success criteria:** Shared shell used by at least two routes with unchanged route-level behavior.
- **MAESTRO Layers:** Agents, Tools, Observability
- **Threats Considered:** UI regression, state coupling, inconsistent telemetry
- **Mitigations:** Snapshot tests for shell, telemetry contract checks, scoped CSS isolation

### Experiment B: `arch/agentic-boundaries-integration-gateway-contract`

- **Objective:** Extract a normalized contract checklist for integration gateway usage.
- **Scope:** Documentation-only in the first iteration.
- **Success criteria:** Contract checklist referenced by agentic docs and governance review.
- **MAESTRO Layers:** Agents, Security, Observability
- **Threats Considered:** mandate drift, undocumented tool access
- **Mitigations:** Evidence checklist linking to governance mandates and provenance logs

### Experiment C: `arch/testing-harness-workbench-smoke`

- **Objective:** Add smoke-test coverage for the Workbench shell and graph canvas.
- **Scope:** Playwright or Vitest UI harness, no production logic changes.
- **Success criteria:** Deterministic pass across 3 runs with zero flake.
- **MAESTRO Layers:** Tools, Observability, Security
- **Threats Considered:** flaky tests, false negatives
- **Mitigations:** deterministic fixtures, explicit waits for graph readiness

## Governance Alignment

- All claims align to `docs/SUMMIT_READINESS_ASSERTION.md` and the governance corpus.
- Exceptions are logged as **Governed Exceptions** with explicit rollback paths.

## State-of-the-Art Enhancement (Proposal)

Adopt an **Architecture Fitness Function Matrix** for each lab thread: each experiment ships with machine-readable acceptance constraints (coupling delta, latency budget impact, and test flake ceiling) and auto-fails promotion if thresholds regress.

## Exit Criteria

- Architecture lab threads have named owners.
- First-pass docs are published in `docs/architecture/`.
- Worktree experiments are isolated and ready for human review.
