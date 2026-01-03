# Guided Workflows

Guided workflows provide a chat-wizard experience that walks non-experts through complex, multi-step tasks while enforcing tool governance and traceability.

## Blueprint format

Blueprints live under `workflows/blueprints/` and follow a declarative YAML structure:

- `metadata`: `id`, `name`, `description`, `risk_level`, and `tags`
- `steps`: ordered steps with `id`, `title`, `description`, `prompt`
  - `input`: `prompt`, `schema` (JSON Schema object), optional `validation`
  - `tool`: `tool_id`, `input_mapping`, `output_mapping`
  - optional `retries`, `stop_condition`, `fallback_step`

The schema is validated by `GuidedWorkflowBlueprintSchema` in `packages/agent-lab` and rejects steps without identifiers or missing prompts.

## Orchestrator

The `GuidedWorkflowOrchestrator` executes a blueprint as a state machine:

1. Load and validate the blueprint (`loadGuidedWorkflowBlueprint`).
2. For each step, collect/validate inputs, route to a registered tool, and merge outputs into the shared context.
3. Apply retry policy per step with graceful failure handling and optional fallback steps.
4. Append immutable action trace events (`STEP_STARTED`, `STEP_COMPLETED`, `STEP_FAILED`, `TOOL_CALLED`, `DEBUG_NOTE`).
5. Emit artifacts and outputs plus a provenance-friendly `actionTrace` timeline.

Feature flag `guidedWorkflows.enabled` must be true (or `GUIDED_WORKFLOWS_ENABLED=true`) to run workflows. Sandbox execution and containerization can be enabled later via `allowSandboxExec`.

## Adding a workflow

1. Copy an existing blueprint from `workflows/blueprints/` and adjust metadata and steps.
2. Keep step prompts concise and pair them with JSON Schema inputs for form rendering.
3. Map inputs/outputs to tool identifiers registered in the orchestrator `ToolRegistry`.
4. Set `retries` and `fallback_step` for any step that can recover in place.
5. Commit the new blueprint and add coverage to `packages/agent-lab/__tests__` if new behaviors are introduced.

## Trace and provenance

The orchestrator always emits an `actionTrace` with timestamps, tool identifiers, and redacted debug logs. Secrets are redacted from trace lines. Provenance records include run IDs, workflow IDs, artifact paths, and output hashes suitable for downstream storage in the ledger.
