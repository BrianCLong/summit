# Daily Sprint Orchestrator (Summit)

## Purpose
Define the governed daily sprint loop for the Summit repo, with evidence-first logging, MAESTRO alignment, and sprint artifact outputs.

## Scope
- Evidence capture for open PRs and labeled issues (security/ga/bolt/osint/governance).
- Daily sprint plan and execution log in docs/ops/DAILY_SPRINT_<YYYY-MM-DD>.md.
- Roadmap status refresh in docs/roadmap/STATUS.json.

## Constraints
- Follow AGENTS.md governance hierarchy and GA guardrails.
- Output evidence before narrative summaries.
- Record Governed Exceptions when tooling or connectivity blocks required steps.
- End each run with an end-of-day status summary.

## Required Outputs
- docs/ops/DAILY_SPRINT_<YYYY-MM-DD>.md
- docs/roadmap/STATUS.json

## Verification
- Validate JSON structure for STATUS.json.
- Capture UEF evidence blocks from gh commands.
