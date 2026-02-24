# Summit Switchboard Truth Table

## Verified Facts (Repository-anchored)

| Fact | Evidence Source |
| --- | --- |
| Switchboard console CLI exists and ships session artifacts. | `apps/switchboard-console/README.md` |
| Switchboard web shell exists under `apps/switchboard-web/`. | `apps/switchboard-web/package.json` |
| Switchboard blueprint documentation exists for local-first governance. | `docs/modules/switchboard-blueprint.md` |
| Switchboard OPA policy bundle file exists. | `policies/switchboard.rego` |

## Assumptions (Validation Tasks)

| Assumption | Validation Task |
| --- | --- |
| No existing MCP meta-orchestrator module in `src/agents/`. | Confirm by inventorying `src/agents/` and registry modules. |
| MCP server registry conventions are not standardized. | Locate MCP server definitions in `mcp/`, `intelgraph-mcp/`, or related packages. |
| Credential storage patterns for MCP orchestration are centralized. | Identify config/secret references in `config/`, `secrets/`, and `server/src/lib/secrets/`. |

## Execution Posture

- Lane 1 changes remain additive and control-plane only.
- Lane 2 changes remain feature-flagged and default OFF.
