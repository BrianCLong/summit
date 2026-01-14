# Skillpacks + Lazy MCP Loading

Never defend the past. Assert the present: Summit now loads MCP tool schemas only when a
skillpack is invoked and only for a minimal shard-aligned subset. The future is governed,
adaptive, and evidence-backed.

## Summit Readiness Assertion

All skillpack invocations must reference the Summit Readiness Assertion for compliance with the
Law of Consistency and governance gating. See `docs/SUMMIT_READINESS_ASSERTION.md`.

## What Skillpacks Are

Skillpacks live under `.summit/skillpacks/<name>/` and provide a self-contained bundle of:

- `SKILL.md` with YAML frontmatter describing name, description, triggers, and shard hints.
- Optional `mcp.json` to define MCP servers and shard-specific tool allowlists.
- Optional `policy.json` to gate tools with allow/deny patterns and break-glass waivers.
- Optional `resources/` for templates or scripts.

The default is **lazy loading**: no tool schemas are injected until a skillpack is invoked.

## Adaptive Tool Sharding (ATS)

Each skillpack can declare shards such as `default`, `deep`, and `ci`. The shard router selects
an appropriate shard based on:

- task type (plan/implement/review)
- governance mode (pr/release/ci)
- repo focus (frontend/backend/security/docs)
- remaining context budget

## Schema Distillation

Summit stores full MCP schemas out-of-band and injects distilled schemas by default:

- tool name and purpose
- typed parameter summary
- safety or permissions note

A tool can be expanded to its full schema on demand via the `expandToolSchema` path, which
requires policy approval and a cached full schema.

## Governance & Permissions

Skillpacks enforce policy gates before tool injection:

- allow/deny tool patterns per environment
- default deny in CI for unknown tools
- break-glass waivers recorded as governed exceptions

## Evidence & Telemetry

Each invocation writes evidence artifacts:

- `artifacts/tool-loading-report.json`
- `artifacts/tool-loading-report.md`

Reports include shard reasoning, tool injection decisions, token estimates, and governed
exceptions. Auto-prune suggestions flag tools that are repeatedly denied or unused.

## Example Skillpacks

- `.summit/skillpacks/ui-preview`
- `.summit/skillpacks/security-audit`

## Usage Flow (Implementation Perspective)

1. Discover skillpacks from `.summit/skillpacks`.
2. Match a trigger and select a shard with ATS.
3. Evaluate policy gating for each tool.
4. Inject distilled tool schemas only for approved tools.
5. Write evidence artifacts and cache full schemas for expansion.

## Deterministic CI Behavior

CI runs default to deny unapproved MCP tools. Use break-glass waivers with TTL and audit
justification to run sensitive tools during CI.
