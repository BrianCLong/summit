# Daily Sprint Orchestrator (v1)

## Objective
Produce a daily sprint plan and evidence-first execution log for the Summit repository, updating the daily sprint log and roadmap status ledger while respecting all governance and GA guardrails.

## Scope
- docs/ops/DAILY_SPRINT_*.md
- docs/roadmap/STATUS.json
- prompts/automation/daily-sprint@v1.md
- prompts/registry.yaml

## Constraints
- Evidence-first output (UEF bundle) before narrative summary.
- Record Governed Exceptions for blocked steps instead of bypassing gates.
- No policy bypasses or security-control reductions.
- Maintain deterministic, audit-ready logs.
