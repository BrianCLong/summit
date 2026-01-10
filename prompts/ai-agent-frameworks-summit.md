# Summit Prompt — AI Agent Frameworks Extraction v1

**Objective:** Produce Summit-ready engineering artifacts from the Shakudo "Top 9 AI Agent Frameworks" survey, aligned to Summit governance and Golden Path readiness.

## Scope

- Update `docs/ai-agent-frameworks-summit.md` with a full capability map, runtime requirements, backlog, orchestrator design, and interop stance.
- Update `docs/roadmap/STATUS.json` to record the deliverable.
- Create a task spec under `agents/examples/` aligned to `agents/task-spec.schema.json`.
- Register this prompt in `prompts/registry.yaml` with immutable hash and declared scope.

## Guardrails

- Keep changes within the declared paths and operations.
- Align with Summit governance authority files and GA guardrails.
- Provide explicit inference labels for content that is not directly derived from the source article.
- Preserve atomic PR scope and avoid cross-zone code changes.

## Success Criteria

- All five deliverables are complete, specific, and actionable.
- Task spec and prompt registry entries validate against schema and hash.
- Roadmap status updated with current timestamp and revision note.

## Stop Conditions

- Any instruction conflicts with Summit governance or GA guardrails.
- Prompt hash mismatch or declared scope violation.
