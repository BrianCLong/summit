# Agentic Trajectory Framework (ATF)

The ATF package introduces a typed JSON schema, validation gates, negative trajectory augmentation, and optional re-execution hooks inspired by the Youtu-LLM agentic recipe. It is intentionally safety-first and ships with a minimal benchmark harness.

## Schema

Trajectories are stored as `AgentTrajectory` objects with:

- `id`: unique identifier
- `meta`: includes `schema_version`, `generator_version`, optional `task_type`, `allowed_tools`, and `allow_unsafe`
- `turns`: ordered steps with `role` (`user`|`assistant`|`expert`), optional `plan`, `toolCalls`, `toolResults`, `reflection`, and `errors`

Tool calls and results must share `call_id` values. Schema version defaults to `1.0.0` and generator version to `0.1.0`.

## Validation gates

`@intelgraph/agentic-trajectories` exposes `validateTrajectory` which applies:

- **Structural**: Ajv-based schema validation, max turn and content length limits.
- **Semantic**: tool allowlist enforcement, unique `call_id` matching, missing result detection.
- **Safety**: default bans dangerous bash patterns (e.g., `rm -rf /`, `curl | sh`, fork bombs). Unsafe commands are blocked unless `allow_unsafe` is explicitly set via meta or options.

Use the CLI:

```bash
pnpm agentic:validate path/to/trajectory.json
```

## Negative augmentation

Utilities in `src/augment/negative.ts` enable controlled perturbations with deterministic seeds:

- `dropTool`: remove one tool from an allowlist.
- `fuzzUser`: introduce mild prompt noise.
- `perturbSteps`: delete or duplicate a turn.

## Re-execution hooks

`runner/reexec.ts` allows opt-in local command execution for code tasks:

- Defaults to `npm test -- --runInBand` in a workspace-bound directory.
- Safe by default: only `npm`, `pnpm`, `yarn`, and `node` are permitted unless `allowUnsafeCommands` is set.
- Paths are normalized to stay within the provided workspace root.

## Agentic Bench harness

`packages/agentic-bench` offers a toy benchmark runner with DeepResearch, Code, and Tool tasks loaded from `packages/agentic-bench/src/benchmarks/*.jsonl`. It wraps requests in a structured system prompt (plan → tool_calls → reflection) and validates generated trajectories before scoring heuristics.

Run locally (mock LLM by default):

```bash
pnpm agentic:bench
```

To exercise the server LLM router configuration instead of the mock provider:

```bash
pnpm agentic:bench --router
```

Artifacts are written to `artifacts/agentic-bench/YYYYMMDD-HHMM/report.json|md`.

## Adding tasks

1. Create a new JSONL file in `packages/agentic-bench/src/benchmarks` or append to an existing one.
2. Fields vary by task type (`deep-research`, `code`, `tool`) but must include a stable `id`, `name`, and `description`.
3. Keep tasks lightweight so CI remains fast.

## Safety model

- **Blocked by default**: destructive shell patterns (wipe/format, remote pipe to shell, fork bombs, shutdown), commands outside the workspace root, and non-allowlisted tools.
- **Allowing unsafe actions**: set `meta.allow_unsafe: true` and pass `allowUnsafeCommands` to re-execution. This is intended for isolated local development only and must not run in CI or production.
