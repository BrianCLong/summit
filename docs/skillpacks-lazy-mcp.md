# Skillpacks + Lazy MCP Loading

Summit skillpacks are governed bundles that lazily inject MCP tool schemas only when a skillpack is invoked. This preserves context budget, enforces policy gating, and produces deterministic evidence artifacts for every run.

## Skillpack Layout

```
.summit/skillpacks/<name>/
  SKILL.md      # YAML frontmatter + instructions
  mcp.json      # MCP servers + tool shards (optional)
  policy.json   # Local allow/deny constraints (optional)
  resources/    # Templates, scripts, or helpers (optional)
```

### SKILL.md Frontmatter

```yaml
name: ui-preview
description: UI validation skillpack for preview builds.
triggers:
  tasks: [review]
  paths:
    - apps/web/**
  keywords: [ui]
shards: [default, deep, ci]
```

## Adaptive Tool Sharding (ATS)

Skillpacks declare shards (for example: `default`, `deep`, `ci`). The router chooses a shard based on task type, governance mode, repo focus, context budget, and intent depth order. This keeps tool payloads minimal and deterministic.

## Schema Distillation + Expansion

Full MCP schemas are cached on disk and kept out of prompt context by default. The injected payloads are distilled (name, purpose, typed parameters, safety notes). Full schemas are expanded only when explicitly requested.

## Governance & Permissions

Policies gate tools with allow/deny patterns and environment rules. CI defaults to deny unless a tool is explicitly allowlisted or a break-glass waiver is active. Governed exceptions are documented in `policy.json` and reported in evidence artifacts.

## Evidence Outputs

Each invocation emits:

- `artifacts/tool-loading-report.json`
- `artifacts/tool-loading-report.md`

These reports capture shard choice, tool decisions, token estimates, and policy outcomes for audit trails and auto-pruning.

## Summit Moats

- **Adaptive Tool Sharding**: dynamic tool subsets per task intent.
- **Schema Distillation**: reduced context cost with deterministic expansion paths.
- **Proof-of-Need Tool Loading**: explicit plan step references and token ledger.
- **Governance-First Permissions**: policy gating with break-glass evidence.
- **Telemetry-Driven Auto-Pruning**: evidence artifacts that surface unused tools and prompt cleanup.

All deviations from baseline behavior are intentionally constrained and logged as governed exceptions, with deferred expansion pending explicit invocation.
