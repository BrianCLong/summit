# Strict Issue Intake Policy

This repository enforces strict issue intake to preserve the Summit Readiness Assertion and the
Law of Consistency. Intake metadata is a gate, not a suggestion. Every issue must satisfy the
required fields before it is considered triage-ready.

## Required metadata (hard gate)

Issues must provide the following fields:

- Priority
- Area
- Type
- Reproducibility
- Acceptance criteria (2+ checklist bullets)

If any required field is missing or malformed, automation applies `triage:needs-info` and posts a
checklist comment. The issue cannot advance to `triage:ready` until the form is complete.

## Labels and milestones

### Label mapping

- Priority → `priority:P0|P1|P2|P3`
- Area → `area:<value>`
- Type → `type:<value>`
- Triage state → `triage:needs-info` or `triage:ready`

### Milestone mapping

Priority drives milestones:

- P0 → GA Hard Gate
- P1 → 30-Day
- P2 → 60-Day
- P3 → Backlog

### Restricted labels and milestones

The following escalation labels are automation-owned and require maintainer authority:

- `priority:P0`
- `priority:P1`
- `ga:blocker`
- `ga:hard-gate`

Restricted milestone:

- GA Hard Gate

When a non-maintainer applies restricted labels or milestones, automation reverts the change and
posts a deterministic notice. This is an intentional guardrail, not a workaround.

## Governed Exceptions

Any intake that does not use the strict templates is classified as a Governed Exception. These
issues remain in `triage:needs-info` until the required metadata is supplied. Exceptions are not
accepted without explicit maintainer confirmation.

## Automation footprint

- **Strict gate workflow:** `.github/workflows/issue-triage-strict.yml`
- **Scheduled compliance audit:** `.github/workflows/issue-audit-strict.yml`
- **Validation script:** `.github/scripts/issue-triage-strict.js`

These workflows are deterministic and idempotent. The scheduled audit does not guess intent; it
only enforces compliance with the required intake metadata.
