# Break-Glass Policy

**Authority:** Summit Readiness Assertion at `/Users/brianlong/Developer/summit/docs/SUMMIT_READINESS_ASSERTION.md`
**Governance:** `/Users/brianlong/Developer/summit/docs/governance/CONSTITUTION.md`, `/Users/brianlong/Developer/summit/docs/ga/GATE_POLICY.md`
**Scope:** CI/CD gates, governance checks, and release-train controls

## Purpose

Break-glass is a governed exception mechanism for time-critical releases. It does not bypass policy; it records an exception with explicit authority, evidence, and rollback triggers.

## Preconditions (All Required)

- A validated, time-bound operational need exists.
- The change is reversible and has an explicit rollback plan.
- A human owner with authority (per governance) approves the exception.
- Evidence artifacts are attached and reference the gate failures.

## Required Evidence Bundle

Attach a single evidence bundle with the following fields:

- `exception_id` (UUID)
- `gate_id` (from `/Users/brianlong/Developer/summit/docs/ga/GATE_FAILURE_CATALOG.md`)
- `rationale` (why break-glass is required now)
- `scope` (what change is covered; exact files)
- `owner` (human approver)
- `rollback_plan` (trigger conditions + steps)
- `expiry` (date/time; no open-ended exceptions)
- `links` (PR, CI logs, incident if applicable)

Store the evidence in:
- `/Users/brianlong/Developer/summit/docs/ga/evidence/` or
- `artifacts/agent-runs/{task_id}.json`

## Approval Flow

1. Author submits exception request with evidence bundle.
2. Aegis reviews for policy compliance.
3. Release Captain (Jules) authorizes execution.
4. Exception is recorded in governance artifacts and referenced in PR metadata.

## Execution Constraints

- Break-glass is limited to the smallest possible scope.
- No security, audit, or logging controls may be reduced.
- Exception expires automatically at the stated expiry.
- Any follow-up remediation must be scheduled in `/Users/brianlong/Developer/summit/docs/roadmap/STATUS.json`.

## Post-Execution Requirements

- Run full gate suite at the earliest safe window.
- Record outcomes and remediation steps in the evidence bundle.
- Close the exception with a status update in the roadmap.

## Canonical Templates

- Exception evidence template: `/Users/brianlong/Developer/summit/docs/ga/evidence/`
- PR metadata linkage: `.github/PULL_REQUEST_TEMPLATE.md`
