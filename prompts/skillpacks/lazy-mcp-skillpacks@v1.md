# Prompt: Lazy-Loaded MCP Skillpacks (Summit)

## Mission

Implement lazy-loaded MCP skillpacks so Summit injects only the minimal, task-appropriate MCP tool schemas when a skillpack is invoked. Add adaptive tool sharding, schema distillation with on-demand expansion, governance gating, and evidence artifacts.

## Requirements

- Skillpack format: `.summit/skillpacks/<name>/` with `SKILL.md` (frontmatter), optional `mcp.json`, optional `policy.json`, optional `resources/`.
- Loader: discover skillpacks, evaluate triggers, invoke selected shard, and inject distilled tool schemas only for allowed tools.
- Adaptive Tool Sharding: support multiple shards and route by task type, governance mode, repo focus, and context budget.
- Schema Distillation: cache full schemas on disk, inject distilled schemas by default, expand full schemas only on demand.
- Governance: allow/deny patterns, environment restrictions, break-glass waivers with TTL and audit evidence.
- Evidence: emit `artifacts/tool-loading-report.json` and `artifacts/tool-loading-report.md`.
- Tests: unit tests for trigger matching, shard selection, distillation/expansion, and evidence output snapshots.

## Determinism & Scope

- Deterministic behavior in CI.
- No "load everything" default behavior.
- Keep changes scoped to skillpack tooling, documentation, and evidence artifacts.
