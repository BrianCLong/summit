# Prompt: Cache-stable generated Cypher plan

## Task
Create a governed documentation plan for cache-stable generated Cypher in Neo4j 2025/Cypher 25, update roadmap status, and register this task in the prompt registry and task-spec examples.

## Requirements
- Add a doc under `docs/neo4j/` that defines objectives, validation plan, evidence artifacts, MAESTRO alignment, rollback posture, and next steps.
- Update `docs/roadmap/STATUS.json` with an in-progress initiative for this plan.
- Register this prompt in `prompts/registry.yaml` with accurate scope and SHA-256.
- Add a task spec under `agents/examples/` that conforms to `agents/task-spec.schema.json`.

## Constraints
- No production defaults change; all behavior is deferred pending validation.
- Evidence-first posture; output raw evidence artifacts when execution begins.

## Definition of done
- All files updated as required.
- Prompt registry contains a valid SHA-256 for this prompt.
- Task spec validates against the schema.
