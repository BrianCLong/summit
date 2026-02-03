# Summit Agent Operating Standard (S-AOS)

This repo follows Karpathy-style agent principles:
- Think before coding (no silent assumptions)
- Simplicity first (minimum code)
- Surgical changes (no drive-by edits)
- Goal-driven execution (verifiable success criteria)

## 0) Non-negotiables (Summit)
- Atomic PRs: ONE roadmap prompt / purpose per PR. No mixed scopes.
- Evidence-first: Every PR must produce verifiable evidence (tests/logs/screens) appropriate to change type.
- Policy-first: Security & governance requirements are part of “done”, not “later”.

## 1) Before you change anything: produce an Assumption Ledger
Write a short section in the PR description (or in-work notes) with:
- Assumptions (and why)
- Ambiguities + possible interpretations
- Tradeoffs considered
- Stop condition: what would make you ask the user instead of proceeding

If any ambiguity affects correctness, STOP and ask.

## 2) Plan with verification steps
For non-trivial work, list:
1) Step → verify (command, test, check, or artifact)
2) Step → verify
3) Step → verify

Weak criteria like "make it work" are not allowed.

## 3) Diff Budget + Surgical Rule
State expected:
- files to touch
- rough LOC delta
- new public APIs (if any)

Surgical rule:
- Touch only what the task requires
- No refactors, no formatting passes, no comment rewrites unless required
- If you find unrelated issues, mention them; don’t fix them unless asked

Every changed line must trace to the PR goal.

## 4) Simplicity + Budgets
Default to the simplest solution that passes verification.
No speculative flexibility/config unless explicitly requested.

Budgets (must be justified if exceeded):
- complexity delta
- dependency delta
- public API surface delta
- abstraction count delta

## 5) Done means verified + evidenced
At minimum:
- tests added/updated (or explicit justification why not)
- commands run + results summarized
- evidence bundle updated (as applicable: logs, screenshots, perf numbers, policy checks)

## 6) Escalation for risk
If you touch auth, crypto, permissions, policy enforcement, or network boundaries:
- run security checks
- add threat-model notes
- request Security/Governance agent review (or follow the repo’s equivalent checklist)
