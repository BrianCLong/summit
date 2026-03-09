# Feature Completion Playbook for Copilot/Codex

Use this playbook to finish existing features with small, merge-safe pull requests.

## 1) Reusable GitHub Issue Template

Create an issue using this exact template when you want a coding agent to complete one partial feature.

```md
## Objective
Complete the existing `<feature-name>` implementation without expanding scope.

## Current State (Evidence)
- File(s): `<path/to/file>`
- Incomplete markers: `<TODO/FIXME/not implemented references>`
- Existing behavior today: `<what currently works>`
- Missing behavior: `<what should be complete after this issue>`

## Acceptance Criteria
- [ ] Feature path is fully implemented for the defined scope.
- [ ] Existing public contracts remain unchanged unless explicitly listed below.
- [ ] Unit/integration tests added or updated for the completed behavior.
- [ ] No `.only`, `.skip`, or placeholder test blocks remain.
- [ ] Documentation updated for user-facing behavior.

## Explicit Non-Goals
- No unrelated refactors.
- No formatting-only repository-wide changes.
- No infrastructure/CI modifications.

## Constraints
- Keep changes localized to `<module-or-directory>`.
- Prefer extending existing patterns over introducing new framework abstractions.
- Stop and report if ambiguous requirements block safe completion.

## Validation Plan
Run and attach outputs for:
- `pnpm lint --max-warnings=0`
- `pnpm typecheck`
- `pnpm test`
- `make smoke` (when touching golden-path flows)

## PR Requirements
- Branch: `feat/<scope>/complete-<feature-name>`
- Title: `feat(<scope>): complete <feature-name>`
- Include risk assessment (`none|low|medium`) and rollback steps.
- Include before/after evidence (logs, test output, screenshots when UI changes).
```

## 2) Reusable VS Code Agent Prompt

```txt
You are implementing one atomic feature-completion task in this repository.

Task:
Complete the existing <feature-name> implementation in <module/path> based on nearby TODO/FIXME/not-implemented markers and current tests.

Rules:
1) Keep scope strictly limited to this feature.
2) Do not introduce unrelated refactors or broad formatting edits.
3) Do not change public APIs unless explicitly required; if required, list every contract change.
4) Add/update tests that prove the completed behavior.
5) Update docs for user-visible behavior.
6) Run: pnpm lint --max-warnings=0, pnpm typecheck, pnpm test, and make smoke if golden-path surfaces are touched.
7) If blocked by ambiguity, stop and produce a "Blocked" summary with precise questions.

Deliverables:
- Summary of changed files and why.
- Test evidence with exact command outputs.
- Draft PR description with risk level and rollback plan.
```

## 3) Reusable GitHub.com Copilot Task Mode Prompt

```txt
Implement the feature-completion item: <feature-name>

Execution constraints:
- Create branch: feat/<scope>/complete-<feature-name>
- Target base: main
- Keep diff small and localized to <module/path>
- No unrelated refactors, renames, or global formatting
- No CI/deployment/config changes unless explicitly listed

Required work:
- Replace all incomplete markers for this feature with production-ready logic
- Add/update focused tests for happy path + key edge case(s)
- Update relevant docs/readme notes

Validation gates (must pass before PR):
- pnpm lint --max-warnings=0
- pnpm typecheck
- pnpm test
- make smoke (if golden-path affected)

If any gate fails:
- Attempt one minimal targeted fix
- If still failing, stop and return a failure report with root cause and proposed next step

Open PR with:
- Title: feat(<scope>): complete <feature-name>
- Summary: what changed, why, and evidence
- Risk: none/low/medium with rollback steps
- Explicit statement of unchanged areas
```

## 4) Atomic PR Checklist

- One feature or sub-feature per PR.
- Prefer <200 lines changed when possible.
- Include tests in the same PR.
- Include rollback trigger and steps.
- Keep merge conflicts low by avoiding broad shared-file edits.
