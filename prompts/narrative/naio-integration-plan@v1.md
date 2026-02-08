# Prompt: NAIO Narrative Signals Integration Plan

## Objective
Produce a governed integration plan for narrative-signal detectors (origin density, comparative
frames, handoffs, robustness) with evidence-first outputs, MAESTRO alignment, and PR stack
sequencing. Update roadmap status in the same PR.

## Required Outputs
- `docs/narrative-signals/naio-integration-plan.md` with architecture, security, evals, ops,
  product, PR package, and roadmap sections.
- Update `docs/roadmap/STATUS.json` with an in-progress initiative entry for the plan.
- Update `prompts/registry.yaml` with this prompt reference and scope.
- Add task spec under `agents/examples/` per `agents/task-spec.schema.json`.

## Constraints
- Evidence-first narrative with explicit MAESTRO layers, threats, and mitigations.
- No policy changes.
- Conventional commits.
