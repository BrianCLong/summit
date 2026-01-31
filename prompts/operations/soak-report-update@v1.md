# Summit — GA Soak Report Update (v1)

**Objective:** Record GA soak run results and prerequisites in the v5.3.2 soak report.

## Scope
- `docs/operations/GA_SOAK_REPORT_v5.3.2.md`
- `docs/roadmap/STATUS.json`
- `prompts/operations/soak-report-update@v1.md`
- `prompts/registry.yaml`

## Constraints
- Report facts only: include cycle results, mode used, and prerequisites.
- Do not claim success when smoke/soak is red.

## Required Content
- Pass/fail per cycle with timestamps (UTC)
- Mode used (`SMOKE_MODE`)
- Prerequisites checklist and whether met
- Short “what changed since last run” line

## Acceptance Criteria
- Report reflects actual run output.
- Roadmap status updated with a concise note.
