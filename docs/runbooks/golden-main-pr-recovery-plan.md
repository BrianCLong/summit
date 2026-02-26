# Golden Main PR Recovery Plan

## Objective
Establish and execute a deterministic recovery flow that keeps `main` golden while unblocking high-value pull requests with failing CI.

## Scope
- Primary zone: `docs/`
- Applies to active queue triage and merge sequencing
- Assumes latest `main` commit has green required checks

## Phase 1 — Mainline Readiness Assertion (Gate Before Merge)
1. Capture **last known good SHA** from `main`.
2. Verify required checks are green:
   - governance/policy gates
   - golden path E2E workflow
   - lint/typecheck/test required by branch protection
3. Record readiness evidence in the PR thread before touching queued branches.

## Phase 2 — Priority PR Recovery Queue (Strict Order)
Execute one PR at a time and require green CI before advancing.

1. `#18688` — Comprehensive Testing Suite
   - Rebase to current `main`
   - Resolve deterministic-test and workflow failures
   - Re-run required checks
2. `#18689` — Sentinel Security (high severity)
   - Rebase after `#18688` merges
   - Validate security and governance gates explicitly
3. `#18640` — Keyboard Shortcuts Accessibility
   - Rebase after security PR merge
   - Validate a11y and front-end checks

## Phase 3 — Backlog Compression Protocol
1. **Stale triage pass**: close dormant/outdated PRs with explicit reason tags.
2. **Auto-merge candidates**: docs/bot/dependency PRs with clean required checks.
3. **Batch rebase waves**: process in groups of 10–20 by domain to reduce merge conflicts.

## Execution Rules
- No merge without green required checks.
- No bypass of governance or security gates.
- Track every batch with evidence links and rollback notes.

## Success Criteria
- `main` remains green after every merge.
- Priority PRs (`#18688`, `#18689`, `#18640`) merged with required checks passing.
- Backlog count reduced through triage + merge waves.
