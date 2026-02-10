# Repo Assumptions & Verification

## 1. Agent Runtime / Tool Invocation
**Assumption:** Summit has an agent runtime we can instrument.
**Verification:** Found `src/agents/index.ts` which contains `AgentOrchestrator`. It has phases (planning, implementation, testing, review) and logs a summary.
**Plan:** Instrument `AgentOrchestrator` or wrap `runAgentPipeline` to capture metrics.

## 2. CI Environment
**Assumption:** GitHub Actions CI exists.
**Verification:** Found `.github/workflows/`.
**Plan:** Create new workflow `ai_productivity_evidence.yml`.

## 3. Telemetry
**Assumption:** Existing telemetry conventions (OpenTelemetry? JSON logs?).
**Verification:** `src/telemetry/CostCarbonTelemetry.ts` exists but seems specific. `AgentOrchestrator` uses `console.log`.
**Plan:** Implement a dedicated JSON artifact writer for productivity metrics, independent of existing logs to ensure determinism.

## 4. Test Runner
**Assumption:** Jest is used.
**Verification:** `AGENTS.md` confirms `pnpm test:unit` uses Jest.
**Plan:** Use Jest for testing new components.

## 5. Artifact Storage
**Assumption:** CI can upload artifacts.
**Verification:** Standard GitHub Actions capability.
**Plan:** Use `actions/upload-artifact` in the new workflow.

