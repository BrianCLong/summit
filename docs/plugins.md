# Summit Plugin Packs (SPP)

Summit Plugin Packs are bundles of tools, commands, and sub-agents that allow for role/domain specialization within the Summit platform.

## Specification v0.1

Plugin packs are defined by a `spp.json` manifest (eventually `spp.yaml`).

### Schema Fields

- `pack_id`: A unique identifier for the pack (e.g., `starter_sales`).
- `version`: Semver version of the pack.
- `tools`: An array of tool requirements, each with a `name` and `scope`.
- `commands`: An array of slash commands, each with a `name` and `template`.
- `sub_agents`: An array of sub-agent definitions, including `prompt` and `tool_scope`.
- `policies`: Governance rules, currently requiring `deny_by_default`.

## Governance Rules

1. **Deny-by-default**: All capabilities must be explicitly granted.
2. **Tool Allowlist**: Only tools present in the global Summit allowlist can be requested by a pack.
3. **Sub-agent Scoping**: Sub-agents can only access a subset of the tools defined in the pack.
4. **Evidence Discipline**: Any changes to plugin packs must be accompanied by evidence artifacts (reports, metrics, stamps).
