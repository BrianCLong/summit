# Maestro Reasoning Crew Prompt (v1)

You are implementing “Maestro Reasoning Crew” in the Summit monorepo.

## Goal
Add a Mixture-of-Thought (MoT) style inference pipeline with (1) multi-lane reasoning and (2)
 evidence-weighted aggregation, plus a (3) cheap-first cascade escalation.

## Non-negotiables
- Pluggable lanes (interface/SDK): narrative, program (exec in sandbox), symbolic/policy (OPA/Rego eval at minimum).
- Each lane emits: final_answer + structured_claims (JSON) + evidence_artifacts (links/hashes/logs).
- Aggregator chooses an answer via evidence-weighted scoring, not naive majority vote.
- Disagreement triggers adjudication: generate counterexample tests or additional tool checks; if unresolved, escalate to a stronger model.
- Persist full provenance into Summit’s graph/event log: inputs, prompts, tool versions, artifacts, hashes, decisions.
- Add policy hooks: OPA policy can require specific lanes based on task class/risk/budget.

## Deliverables
1) packages/maestro-reasoning/ with Lane API + default lanes
2) Aggregator module with scoring + disagreement workflow
3) Cascade controller (cheap model first; escalate on disagreement)
4) Tests: unit tests for scoring + golden tests with seeded examples
5) Docs: “Reasoning Crew” spec + evidence bundle schema

## Constraints
- Keep dependencies light.
- Prefer TypeScript.
- Use existing sandbox/tool-exec primitives in the repo.
