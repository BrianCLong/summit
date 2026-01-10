# Backlog Execution Ledger

This ledger is the in-repo source of truth for backlog item execution. Update it alongside project board changes so progress remains auditable even when external systems are unavailable.

## How to use this ledger

- **Add one row per backlog item** covering the required governance fields.
- **Statuses**: `Queued`, `In Progress`, `Blocked`, `Review`, `Done`, or `Won't Do`.
- **Verification commands** should list the exact commands and artifacts (logs, screenshots, coverage) used to validate the change.
- **Notes/Risks** must capture blockers, dependencies, or rollout considerations.
- **Authority references** must align with the Summit Readiness Assertion and governance canon.

## Authority references

- **Summit Readiness Assertion**: `docs/SUMMIT_READINESS_ASSERTION.md`
- **Constitution & Meta-Governance**: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`
- **Agent mandates & GA guardrails**: `docs/governance/AGENT_MANDATES.md`, `docs/ga/`

## Current items

| Backlog Item Title        | Project Item URL                                | Linked Issue(s) | PR(s) | Owner Subagent | Status | Verification Commands                                                  | Authority References                                                          | Notes/Risks                                                                |
| ------------------------- | ----------------------------------------------- | --------------- | ----- | -------------- | ------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Backlog ingestion kickoff | https://github.com/users/BrianCLong/projects/19 | N/A             | N/A   | Orchestrator   | Queued | Pending: backlog enumeration; scripts/check-boundaries.cjs; make smoke | docs/SUMMIT_READINESS_ASSERTION.md; docs/governance/CONSTITUTION.md; docs/ga/ | External project access required; will proceed once enumeration completes. |

## Update cadence

- Refresh this ledger whenever an item moves state or new evidence is produced.
- Mirror updates to the GitHub Project item and linked issues to keep tracking consistent.
- Attach verification commands after every local validation run to maintain provenance.
