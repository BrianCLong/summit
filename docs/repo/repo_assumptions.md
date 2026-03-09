# Summit MCP Ecosystem Repo Reality Check

## Objective

This file hardens the MCP ecosystem follow-up plan against the **actual** `summit` repository layout so execution can proceed without path or CI-name drift.

## Verified Platform Facts (Present-State)

| Area                                 | Verified                                                                         | Evidence                                   |
| ------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------ |
| Monorepo package manager             | `pnpm` workspace is present                                                      | `pnpm-workspace.yaml`, root `package.json` |
| Existing MCP package surfaces        | `packages/mcp`, `packages/mcp-gateway`, `packages/mcp-apps` exist                | directory scan                             |
| Existing MCP server implementation   | `mcp/summit_server/src/server.ts` exists                                         | source tree                                |
| Existing orchestrator implementation | `server/src/conductor/mcp/orchestrator.ts` exists                                | source tree                                |
| Existing gateway service surface     | `server/src/mcp-gateway/index.ts` exists                                         | source tree                                |
| Existing policy controls             | `policies/security/mcp_governance.rego` and capability-fabric MCP policies exist | source tree                                |
| Existing contract/schema checks      | `scripts/ci/validate_mcp_contract.mjs` exists                                    | source tree                                |
| Existing drift automation            | `.github/workflows/mcp-drift.yml` exists                                         | workflow tree                              |

## Validated Paths for Follow-Up Plan Mapping

### Registry / Discovery / Gateway / Orchestration Anchors

- `mcp/summit_server/src/` (Summit MCP server runtime and transports)
- `server/src/conductor/mcp/` (orchestration/client/transport)
- `server/src/mcp-gateway/` (gateway policy + audit + index)
- `packages/mcp/` (shared MCP task/client library)
- `packages/mcp-gateway/` (gateway package stub + architecture anchor)
- `packages/mcp-apps/` (MCP app governance and resolver path)

### Policy & Security Anchors

- `policies/security/mcp_governance.rego`
- `policies/capability-fabric/mcp-invoke.rego`
- `policies/capability-fabric/mcp-session.rego`
- `mcp/allowlist.yaml`

### CI / Verification Anchors

- `.github/workflows/mcp-drift.yml`
- `.github/workflows/toolcall_conformance.yml`
- `.github/workflows/slo-smoke-gate.yml`
- `scripts/ci/validate_mcp_contract.mjs`
- `scripts/ci/verify_mcp_only_tools.mjs`
- `tools/ci/verify_mcp_deny_by_default.py`
- `scripts/monitoring/mcp-apps-drift.mjs`
- `scripts/k6/mcp_slo.js`

## Plan Corrections vs Initial Assumptions

1. **Do not introduce a net-new `packages/mcp-server/` immediately.**
   Extend existing `mcp/summit_server` and `server/src/mcp-gateway` surfaces first.
2. **Use existing orchestration substrate** in `server/src/conductor/mcp/` instead of creating a parallel planner from scratch.
3. **Treat `packages/mcp-gateway/` as architecture contract layer** and implement runtime behavior in `server/src/mcp-gateway/` until package migration is explicitly approved.
4. **Bind security gates to existing Rego locations** rather than creating a disconnected policy tree.
5. **Anchor drift/perf evidence to existing scripts and workflow names** before adding new scheduled workflows.

## Must-Not-Touch Until Coupled Tests Are Green

- Existing branch-protection required checks and reusable workflow contracts under `.github/workflows/_reusable-*`.
- Security and governance policy baselines under `policies/security/` and `policies/capability-fabric/`.
- Production deployment workflows and release train files.

## Ready Execution Slice (Next)

1. Add MCP tool registry metadata normalization over existing server/gateway paths.
2. Add policy-aware discovery filtering integrated with current Rego policy files.
3. Add deterministic evidence artifacts for tool-list, policy decisions, and orchestration traces.
4. Add CI guard updates only as additive checks mapped to existing workflows.
