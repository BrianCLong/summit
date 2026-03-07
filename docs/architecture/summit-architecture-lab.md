# Summit Architecture Lab (Codex Desktop Project Definition)

## Readiness Gate

All lab activity inherits the Summit Readiness Assertion and is evidence-first, reversible, and human-reviewed before merge.

## Canonical Repo and Project Envelope

- **Canonical repo**: `~/src/summit`.
- **Project name**: `Summit Architecture Lab`.
- **Primary zone for this initiative**: `docs/` (architecture outputs), with proposal references to `apps/web` and `agentic`.

## Parallel Thread Operating Model

| Thread | Goal | Input Surface | Output Artifact | Default Skills |
| --- | --- | --- | --- | --- |
| Frontend Architecture | Map frontend boundaries and refactor seams; classify keep/change/extract targets. | `apps/web/src/*` | `docs/architecture/frontend-overview.md` | `angular-standalone-architecture` (skills.lc), `ui-architecture-audit`, `diagram-mermaid` |
| Agentic Patterns | Map orchestration seams, contracts, and governance hooks. | `agentic/*`, `pipelines/*`, governance files | `docs/architecture/agentic-seams.md` | `agentic-architecture-audit`, `governance-gate-check`, `threat-model-maestro` |
| Testing and Playwright | Design evidence-focused regression harnesses for future architecture experiments. | `apps/web`, `playwright/*`, test configs | architecture test plan appendix | `playwright-smoke-suite`, `evidence-bundle-generator` |
| Docs and Diagrams | Consolidate architecture narratives and authority-linked diagrams. | `docs/architecture/*` | architecture map updates and references | `docs-architecture-curator`, `diagram-mermaid` |

**Skill sourcing contract**: install Angular/standalone-component skills from the owner-provided `skills.lc` bundle before opening thread execution.

## Worktree / Sandbox Conventions

### Naming and Isolation

- Worktree root: `_worktrees/`.
- Branch prefixes:
  - `arch/frontend-layout/<short-desc>`
  - `arch/agentic-boundaries/<short-desc>`
  - `arch/testing-harness/<short-desc>`
  - `arch/docs-diagrams/<short-desc>`
- One thread owns one worktree. Cross-thread file edits require explicit handoff.

### Promotion Rules

- **Experiment-only branches**: default state; no PR unless explicitly promoted.
- **PR-eligible branches** must include:
  1. Decision rationale
  2. Confidence score (0–1) with basis
  3. Rollback trigger and rollback steps
  4. Accountability window and metrics watch list
  5. Evidence bundle references

### Merge Safety Contract

- No direct commits to `main`.
- All branches must merge through human-reviewed PRs.
- Label every PR `patch`, `minor`, or `major`.

## Architecture Experiment Catalog (Named)

| Experiment | Branch | Objective | Scope | Success Criteria |
| --- | --- | --- | --- | --- |
| Provider Contract Hardening | `arch/frontend-layout/provider-contract-hardening` | Make provider ordering explicit and testable. | `apps/web` composition layer only. | Provider order regressions fail deterministically in CI. |
| Workbench Shell Extraction | `arch/frontend-layout/workbench-shell-extract` | Extract shell interfaces without behavior change. | Workbench interfaces + packaging boundary. | No route or UX drift; reduced import coupling. |
| Graph View Adapter Layer | `arch/frontend-layout/graph-view-adapter` | Abstract graph renderer interface from D3 internals. | `apps/web/src/graphs/*` only. | Existing interactions preserved with adapter tests. |
| Orchestrator Signal Wiring | `arch/agentic-boundaries/orchestrator-signal-wiring` | Replace simulated loop inputs with telemetry adapters. | `agentic/core/*` and telemetry adapters. | Replayable deterministic cycle evidence. |
| Pipeline Mandate Gate | `arch/agentic-boundaries/pipeline-mandate-gate` | Require mandate validation at pipeline entry. | `pipelines/registry`, `pipelines/runners`. | Invalid mandates blocked with auditable evidence. |

## Deliverable Contract

- Frontend reconnaissance and recommendations: `docs/architecture/frontend-overview.md`
- Agentic seam map and proposals: `docs/architecture/agentic-seams.md`
- Project and execution model: `docs/architecture/summit-architecture-lab.md`
- Initiative tracking entry: `docs/roadmap/STATUS.json`

Finality: the lab is now codified for parallel architecture exploration with governed promotion gates and reversible experimentation.
