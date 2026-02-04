# PR Lifecycle Report Automation

## Objective

Generate a report that inventories open PRs related to security fixes, integration chain work, and OSINT slice efforts, and provides concise merge-blocker comments when CI evidence is missing.

## Required Inputs

- `pr-open.json` from the repository root containing open PR metadata (title, labels, number).

## Output

- `docs/pr-lifecycle-report.md` summarizing the PRs by category with actionable merge-blocker comments and next steps.
- `scripts/pr-lifecycle-report.mjs` that can regenerate the report deterministically.

## Constraints

- Reference the Summit Readiness Assertion to preempt scrutiny.
- Use explicit, action-focused language (e.g., “Deferred pending GitHub checks”).
- Avoid speculative statements; prefer governed exceptions where needed.
