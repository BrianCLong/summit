# Agent-Age MCP Architecture Alignment

## Summit Readiness Assertion

This guidance operates under the **Summit Readiness Assertion**, which declares the platform ready and treats deviations as governed exceptions rather than defects. Any MCP server extensions must preserve the certified capabilities and CI invariants stated there. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative statement.

## Purpose

Summit MCP services already emphasize conformance, governance, and replay. This note aligns the MCP server architecture to agent-era expectations (capability discovery, deterministic execution, and policy-first security) and maps those expectations to Summit components.

## Agent-Age Architecture Principles

1. **Contract-first capabilities**
   - MCP tools/resources/prompts are published through typed manifests with immutable IDs, versioned schemas, and compatibility constraints.
2. **Deterministic execution by default**
   - Every tool call is replayable with stable inputs, output hashes, and side-effect stubs for audit-safe reproduction.
3. **Least-privilege execution plane**
   - Scoped credentials, policy checks on every invocation, and deny-by-default tool access per tenant/session.
4. **Observable, inspectable runtimes**
   - Per-tool latency/error budgets, structured traces, and causal graphs that join runs to provenance.
5. **Composable, transport-agnostic connectivity**
   - Clients may choose STDIO or HTTP+SSE; the server preserves identical semantics and error contracts across transports.
6. **Governed extensibility**
   - Marketplace listings require conformance, sandbox posture, and signed artifacts before tools are discoverable.

## Summit MCP Mapping

| Principle                       | Summit MCP Implementation                                 | Evidence / Reference                                             |
| ------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| Contract-first capabilities     | MCP conformance specification and marketplace badge model | `intelgraph-mcp/docs/conformance/mcp-tool-server-conformance.md` |
| Deterministic execution         | Replay-as-a-feature, provenance ledger, signed artifacts  | `docs/evidence/provenance-ledger.md`                             |
| Least-privilege execution plane | OPA-backed ABAC, MCP scoped sessions                      | `docs/security/threat-models/maestro-runs.md`                    |
| Observable runtimes             | MCP Grafana dashboards, alert rules                       | `docs/observability/alerts/mcp-rules.yaml`                       |
| Transport-agnostic connectivity | MCP roles and journeys across transports                  | `intelgraph-mcp/docs/architecture/mcp-roles-and-journeys.md`     |
| Governed extensibility          | Governance scaffolding and conformance CLI                | `docs/governance/scaffolding/MCP_GOVERNANCE.md`                  |

## Implementation Actions (Documentation-Only)

- Maintain a single **MCP capability manifest** per server that lists tools, resource schemas, and scope requirements.
- Align MCP server onboarding checklists with conformance, sandbox posture, and replay requirements.
- Require each MCP server release to publish trace IDs and replay artifacts in evidence packs.
- Treat any deviation from the readiness assertion as a **Governed Exception** with explicit review notes.

## Outcome

This alignment keeps Summit MCP servers deterministic, auditable, and governed while meeting agent-era expectations for composable tool ecosystems and fast capability discovery.
