# Repo Assumptions & Reality Check

## Verified
- **Repo exists**: `BrianCLong/summit` (MIT licensed).
- **Target Package**: `agents/orchestrator` (`@intelgraph/multi-llm-orchestrator`) is the real orchestrator.
  - Confirmed via `grep` for "OpenAI" and "Anthropic" providers.
  - Contains `src/providers/` with `OpenAIProvider.ts` and `ClaudeProvider.ts`.
- **Test Runner**: `vitest` (v1.6.1).
  - Configured in `agents/orchestrator/package.json`.
  - Tests located in `agents/orchestrator/__tests__/`.
- **Module System**: ESM (`type: "module"` in `package.json`).

## Assumed
- **Feature Flags**: Likely environment variable based or a simple config object. No dedicated `launchdarkly` or similar service observed yet.
- **Budget**: Enforced via caller-supplied `budget` parameter in the new DAAO router (as per plan).
- **Telemetry**: Logging via `console` or custom logger (observed `Omniscience` logging in `agentic`, but `agents/orchestrator` uses standard logging or potentially `pino` based on dependencies). `agents/orchestrator` has no explicit logger import in the snippets seen, but likely uses `console` or injected logger.

## Target Directory Structure for DAAO
All DAAO components will be placed in `agents/orchestrator/src/daao/`:
- `agents/orchestrator/src/daao/difficulty/`
- `agents/orchestrator/src/daao/routing/`
- `agents/orchestrator/src/daao/collaboration/`

## Test Placement
- `agents/orchestrator/__tests__/daao/difficulty/*.test.ts`
- `agents/orchestrator/__tests__/daao/routing/*.test.ts`
- `agents/orchestrator/__tests__/daao/collaboration/*.test.ts`
