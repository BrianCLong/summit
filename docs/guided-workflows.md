# Guided Workflows

Guided workflows provide a chat-wizard experience that walks non-experts through complex, multi-step tasks while enforcing tool governance, rate limits, and traceability.

## Blueprint format

Blueprints live under `workflows/blueprints/` and follow a declarative YAML structure:

- `metadata`: `id`, `name`, `description`, `risk_level`, and `tags`
  - Optional `access`: `allowed_roles` and `required_attributes`
- `steps`: ordered steps with `id`, `title`, `description`, `prompt`
  - `input`: `prompt`, `schema` (JSON Schema object or property map), optional `validation`
  - `tool`: `tool_id`, `input_mapping`, `output_mapping`, optional `timeout_ms`
  - optional `retries`, `stop_condition`, `fallback_step`

The schema is validated by `GuidedWorkflowBlueprintSchema` in `packages/agent-lab` and rejects steps without identifiers or missing prompts.

## Orchestrator

The `GuidedWorkflowOrchestrator` executes a blueprint as a state machine:

1. Load and validate the blueprint (`loadGuidedWorkflowBlueprint`).
2. Evaluate access policy and optional `policyEvaluator` hooks before workflow/step/tool execution.
3. For each step, collect/validate inputs, route to a registered tool, map inputs/outputs, and merge outputs into the shared context.
4. Apply retry policy per step with debug-handler-assisted recovery and optional fallback steps.
5. Append immutable action trace events (`STEP_STARTED`, `STEP_COMPLETED`, `STEP_FAILED`, `TOOL_CALLED`, `TOOL_COMPLETED`, `POLICY_CHECK`, `DEBUG_NOTE`).
6. Emit artifacts, step runs, tool calls, and outputs plus a provenance-friendly `actionTrace` timeline.

Feature flag `guidedWorkflows.enabled` must be true (or `GUIDED_WORKFLOWS_ENABLED=true`) to run workflows. Sandbox execution and containerization can be enabled later via `allowSandboxExec`.

### Orchestrator safety hooks

- `policyEvaluator` enforces RBAC/ABAC and tool allowlists.
- `maxSteps`, `maxArtifacts`, and `maxRuntimeMs` cap runaway workflows.
- `debugHandler` supports in situ debugging loops with trace notes and input patches.
- `WorkflowRunStore` allows append-only persistence of run metadata, traces, and outputs.

## Adding a workflow

1. Copy an existing blueprint from `workflows/blueprints/` and adjust metadata and steps.
2. Keep step prompts concise and pair them with JSON Schema inputs for form rendering.
3. Map inputs/outputs to tool identifiers registered in the orchestrator `ToolRegistry`.
4. Set `retries` and `fallback_step` for any step that can recover in place.
5. Commit the new blueprint and add coverage to `packages/agent-lab/__tests__` if new behaviors are introduced.

## Trace and provenance

The orchestrator always emits an `actionTrace` with timestamps, tool identifiers, and redacted debug logs. Secrets are redacted from trace lines. Provenance records include run IDs, workflow IDs, artifact paths, tool calls, and output keys suitable for downstream storage in the ledger.
