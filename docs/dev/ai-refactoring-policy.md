# AI-Assisted Refactoring Policy (Phase 1)

This policy defines how we use AI tooling to propose refactors safely. It focuses on small, low-risk updates while we gain confidence in the pipeline.

## Allowed AI Changes

- Internal implementation details that do **not** alter public APIs (e.g., private helpers, internal wiring, dependency inversion inside a module).
- Tests, fixtures, documentation, comments, and type annotations.
- Code quality improvements that reduce duplication, tighten naming, or clarify intent **within** a module's existing surface area.
- Build, lint, and formatting fixes that keep existing behavior intact.

## Changes Requiring Manual Review or Opt-In Approval

- Any modification that changes a public API, exported types, CLI surface, or network contract.
- Security-sensitive logic, including authentication, authorization, audit, data handling, or secrets management flows.
- Cross-cutting behavior changes (caching strategy, retry logic, error handling semantics, concurrency models).
- Schema or persistence changes (database migrations, GraphQL schema updates) without explicit human sign-off.
- Infrastructure and CI/CD changes beyond the scoped refactor runner itself.

## Guardrails for AI-Generated PRs

- All AI-driven refactors **must** target files listed in `ai-refactor/targets.yml` for the active phase.
- Every run must produce a prompt, the LLM response, and a diff summary for reviewers.
- Required checks: lint, typecheck, and scoped tests (as defined per target). Failures block submission.
- PR body must include:
  - A "before vs after" summary that highlights risk areas.
  - A safety checklist confirming: (1) no public API or security-sensitive changes and (2) tests and lint/typecheck ran.
  - A link to this policy document.
- No automatic merges. Human review and approval are always required.

## Operational Expectations

- Phase 1 is limited to a small set of non-critical targets to validate safety (see `ai-refactor/targets.yml`).
- The refactor runner defaults to **dry-run** mode in CI; write operations only occur locally or on explicitly approved branches.
- LLM calls go through the existing client endpoint (`LLM_LIGHT_BASE_URL`/`LLM_LIGHT_API_KEY`) so we can reuse monitoring and rate limits.
- If the LLM is unavailable, the runner records the prompt and exits without modifying files.
- Each refactor branch should stay small and focused; avoid batching unrelated targets.

## Approval and Oversight

- AI-authored changes must be reviewed by an engineer familiar with the affected area.
- Sensitive areas (public APIs, security flows) require explicit reviewer confirmation even if untouched.
- The refactor owner is responsible for validating the output, rerunning checks after edits, and confirming compliance with this policy.
