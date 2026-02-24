# Prompt: AI Growth Bottlenecks (InvestorPlace 2026-02-01)

## Objective

Establish the baseline schema + standards documentation for the AI growth bottlenecks intake, and
record repo assumptions for follow-on implementation.

## Scope

- Create `schemas/bottlenecks.report.schema.json` aligned with governance evidence ID policy.
- Create `docs/standards/ai-growth-bottlenecks-2026-investorplace.md` with import/export matrix,
  determinism guarantees, and non-goals.
- Update `repo_assumptions.md` with verified/assumed paths and constraints for the bottlenecks MWS.
- Update `docs/roadmap/STATUS.json` to record the initiative.

## Constraints

- Deterministic artifacts only; no timestamps in report schema.
- Follow repository governance requirements and evidence ID policy.
- Do not modify CI workflows or release gates.
