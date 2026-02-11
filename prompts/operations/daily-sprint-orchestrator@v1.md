# Summit — Daily Sprint Orchestrator (v1)

**Objective:** Produce a daily sprint plan, evidence bundle, and merge-ready updates from current Summit repo state.

## Scope
- `docs/ops/DAILY_SPRINT_YYYY-MM-DD.md`
- `docs/ops/evidence/daily-sprint-YYYY-MM-DD/`
- `docs/roadmap/STATUS.json`
- `prompts/operations/daily-sprint-orchestrator@v1.md`
- `prompts/registry.yaml`

## Constraints
- Follow repo `AGENTS.md` governance and GA/ops guardrails.
- Produce deterministic evidence (`report.json`, `metrics.json`, `stamp.json`).
- Do not bypass or weaken security, policy, or GA gates.

## Required Behavior
- Capture open PR snapshot (top 20, recency order).
- Attempt labeled issue triage for security/ga/bolt/osint/governance labels.
- Create sprint plan with 3 to 6 tasks, each with goal, scope, validation.
- Record blockers using "Deferred pending X" language.
- Update `docs/roadmap/STATUS.json` in the same change set.

## Acceptance Criteria
- Evidence bundle created for the day.
- Daily sprint report updated with plan, execution log, and end-of-day summary.
- One merge-ready PR or updated PR reflects the sprint outputs.
