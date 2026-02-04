# Repo Assumptions

*   **Verified**
    *   Repo exists and is MIT licensed.
    *   Root contains `.ci/` and `__tests__/` and agent-related dirs (`agentic/`, `agents/`, `agent-bundle/`).
    *   **Orchestrator**: `packages/maestro-core` is the real orchestrator package, using `LiteLLMPlugin` for model calls.
    *   **Test Runner**: `jest` is used in `packages/maestro-core`.
    *   **Module System**: `packages/maestro-core` is an ESM package (`"type": "module"` in `package.json`).
    *   **Target Directory**: `packages/maestro-core/src/daao/` is the chosen location for DAAO modules.

*   **Assumed**
    *   The `litellm-plugin.ts` handles the actual execution of LLM steps, and DAAO will interface with it or be used by the engine to configure steps before execution.
    *   Existing "budget" concept is limited or non-existent in the core, so DAAO will introduce explicit budget checks.

*   **Validation checklist (completed)**
    1.  Identify the real orchestrator package: `packages/maestro-core`.
    2.  Confirm test runner + command: `jest` / `npm test`.
    3.  Confirm TS path aliases + module system: ESM.
    4.  Confirm logging/telemetry conventions: `metadata` object in `StepExecution` result.
    5.  Confirm any existing "budget" concept: `LiteLLMPlugin` has basic cost calculation but no enforcement.

*   **Must-not-touch**
    *   Existing security/CI policy directories without explicit need: `.security/`, `.ci/`, `SECURITY/` (unless adding additive docs only).
