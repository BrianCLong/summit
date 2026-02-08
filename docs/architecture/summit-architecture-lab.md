# Summit Architecture Lab (Codex Desktop Project Definition)

## Readiness Gate

All lab activity inherits the Summit Readiness Assertion and must remain evidence-first, reversible, and human-reviewed before merge.

## Canonical Repo & Project Layout

- **Canonical repo**: `~/src/summit` (single source of truth).
- **Codex Desktop project**: “Summit Architecture Lab”.
- **Thread Model (Parallel Agents)**:

| Thread | Goal | Default Skills |
| --- | --- | --- |
| Frontend Architecture | Map current frontend structure, patterns, and seams; generate `frontend-overview.md`. | `angular-standalone-architecture` (skills.lc), `ui-architecture-audit`, `diagram-mermaid` |
| Agentic Patterns | Identify agentic integration seams, contracts, and constraints; generate `agentic-seams.md`. | `agentic-architecture-audit`, `governance-gate-check`, `threat-model-maestro` |
| Testing & Playwright | Define safe UI/regression harnesses and evidence-first UI tests. | `playwright-smoke-suite`, `evidence-bundle-generator` |
| Docs & Diagrams | Consolidate architecture docs and diagrams; enforce citation/authority links. | `docs-architecture-curator`, `diagram-mermaid` |

**Skill Sourcing**: Install Angular/standalone component skills from the `skills.lc` bundle referenced by the project owner before thread start. The lab assumes those skills are present and loadable by name.

## Worktrees / Sandboxes for Parallel Refactors

### Worktree Convention

- **Base**: `main` is read-only for agents.
- **Worktree root**: `_worktrees/`.
- **Branch naming**:
  - `arch/frontend-layout/<short-desc>`
  - `arch/agentic-boundaries/<short-desc>`
  - `arch/testing-harness/<short-desc>`
  - `arch/docs-diagrams/<short-desc>`

### Rules of Engagement

- **Experiment-only branches** stay local unless promoted by human review.
- **PR eligibility** requires: evidence bundle, rollback plan, and readiness assertion alignment.
- **No collisions**: each thread owns one worktree and cannot edit cross-zone files without explicit coordination.
- **Default approvals**: for tooling and command execution, the lab requests permission prior to running commands; approvals are logged as evidence.

## PR Criteria (Architecture Lab)

- **Docs-only changes** can submit PRs once evidence and readiness assertions are attached.
- **Behavioral changes** require human countersign and full gate checks.
- **Labeling**: apply `patch` / `minor` / `major` classification on every PR.

## Output Expectations

- **Frontend Architecture**: `docs/architecture/frontend-overview.md` (current map + keep/change/extract).
- **Agentic Patterns**: `docs/architecture/agentic-seams.md` (seams + candidate experiments).
- **Experiment Catalog**: stored in the PR description and tracked in `docs/architecture/summit-architecture-lab.md`.
