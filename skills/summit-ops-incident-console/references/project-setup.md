# Summit Ops project definition

## Trusted project root & layout

- **Project root**: `~/src/summit` (or the checked-out repo root).
- **Expected layout**:
  - `~/src/summit/.codex/` for project-scoped Codex Desktop config and automation manifests.
  - `~/src/summit/skills/` for local Summit skills.
  - `~/src/summit/docs/` for governance, readiness, and runbooks.
- **Readiness anchor**: Reference `docs/SUMMIT_READINESS_ASSERTION.md` before presenting conclusions.
- **Authority files**: Treat `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, and `docs/ga/` as non-negotiable sources of truth.

## Standing threads (parallel)

Create four standing threads under the project:

1. **CI & Governance**
   - **Default goals**: Summarize CI health, required checks, merge-queue status, and governance gate adherence.
   - **Auto-load skills**: `summit-ga-preflight-hard-gate-auditor`, `summit-pr-stack-sequencer`.
   - **Allowed Git operations**: Read-only (`git status`, `git diff`, `git log`).

2. **Security & Observability**
   - **Default goals**: Track security scan results, audit logs, and observability regressions; queue items for human review.
   - **Auto-load skills**: `summit-skill-router`, `summit-ga-preflight-hard-gate-auditor`.
   - **Allowed Git operations**: Read-only only.

3. **Release Train**
   - **Default goals**: Track release readiness, GA gates, and rollout dependencies.
   - **Auto-load skills**: `summit-pr-stack-sequencer`, `summit-ga-preflight-hard-gate-auditor`.
   - **Allowed Git operations**: Read-only by default; enable `git checkout -b` only with explicit approval.

4. **Frontend UX / Playwright**
   - **Default goals**: Run UI smoke checks, capture screenshots for UI deltas, and document UX risk.
   - **Auto-load skills**: `react-best-practices-pack` (or local UI skill), `summit-ga-preflight-hard-gate-auditor`.
   - **Allowed Git operations**: Read-only only.

## Thread governance policy

- Require every thread summary to cite evidence (CI URLs, logs, file paths).
- Escalate exceptions as "Governed Exceptions" and link them to authority files.
- Enforce the Law of Consistency: definitions must align with governing documents.
