# Guided Workflows

Guided workflows turn complex, expert-driven flows into structured chat wizards backed by policy-gated tool orchestration. Blueprints declare the conversational prompts, JSON Schema inputs, tool calls, and recovery logic; the orchestrator executes them with governance and traceability baked in.

## Blueprint format

Blueprints live in `workflows/blueprints` and are authored in YAML or JSON. They follow the schema in `packages/agent-lab/src/guidedWorkflowBlueprint.ts`:

- **metadata**: `id`, `name`, `description`, `risk_level`, `tags`
- **featureFlag**: gate execution (default `guidedWorkflows.enabled`)
- **policies**: `maxAttempts`, `allowDebug`, `redactKeys`, `rateLimitPerRun`
- **steps**:
  - `id`, `title`, `prompt`
  - `inputSchema`: JSON Schema for dynamic form rendering
  - `validations`: rule-based checks (required, regex, enum, uri/email)
  - `tool`: `toolId`, `inputMapping`, `outputMapping`, `retries`, `fallbackStepId`
  - `stopConditions`: halt rules (equals/exists)
  - `retries`, `fallbackStepId`

### Example blueprints
- `workflows/blueprints/data-to-graph.yaml`: Data extraction → normalize → entity resolve → graph ingest.
- `workflows/blueprints/doc-summarize-claim-check.yaml`: Doc set → summarize → claim-check → report.

## Orchestrator

`GuidedWorkflowOrchestrator` (in `packages/agent-lab/src/guidedWorkflowOrchestrator.ts`) executes a blueprint as a rules-first state machine:

1. Load blueprint, enforce `featureFlag`, and build a policy-aware `ToolBus` with sandboxed tools.
2. For each step: collect inputs, validate via JSON Schema + declarative rules, evaluate stop conditions, and dispatch tools with retries/fallbacks.
3. Persist evidence and append-only `actionTrace` (`trace.ndjson`) with redaction of sensitive keys.
4. Emit a `RunSummary` including objectives, expectations, evidence IDs, and the action trace path for provenance.

### Governance and safety
- **RBAC/ABAC ready**: Feature flag `guidedWorkflows.enabled` gates execution, with per-tool policy evaluation by the ToolBus.
- **Rate limits**: Blueprint policies include per-run rate limits; tool executions inherit the existing policy engine defaults.
- **Redaction**: `redactKeys` prevent secrets from entering traces.
- **Recovery**: Retries and `fallbackStepId` enable recovery loops and in-situ debugging.

## Adding a new workflow
1. Copy one of the blueprints in `workflows/blueprints/` and update `metadata` + `steps`.
2. Use JSON Schema to define `inputSchema` for each prompt; add `validations` for cross-field rules.
3. Map user inputs to tools with `tool.inputMapping` and add `stopConditions` or `fallbackStepId` where needed.
4. Run the orchestrator with mock tools in tests (see `packages/agent-lab/__tests__/guidedWorkflowOrchestrator.test.ts`).
5. Wire the workflow into the UI via `ui/src/components/GuidedWorkflows.jsx` to expose the wizard and trace timeline.
