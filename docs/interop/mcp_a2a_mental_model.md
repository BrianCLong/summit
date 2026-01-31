# MCP + A2A: layered interoperability model for Summit

## Readiness alignment
This plan aligns to the Summit Readiness Assertion and treats interop as a governed, evidence-first
capability with deny-by-default gates, deterministic outputs, and explicit rollback paths.

## Layered mental model (networking analogy)
- **Layer 2 (data plane): MCP tool execution.** MCP provides tool discovery and invocation inside
  a chosen agent boundary.
- **Layer 3 (control plane): A2A agent discovery and routing.** A2A provides AgentCard discovery
  and task dispatch, selecting the right agent before tool execution.

The layers are complementary rather than competing: A2A routes to the right agent; MCP runs tools
inside that agent.

## Summit mapping
- **Control plane:** A2A discovery/routing + policy checks + evidence emission.
- **Data plane:** MCP tool calls in the selected agent, gated by allowlists and taint rules.

## Example flow (wifi roaming analysis)
1. **Route:** A2A discovers an RF analysis agent with the `wifi` capability.
2. **Policy gate:** allowlisted endpoint and capability match verified.
3. **Execute:** MCP invokes the agent-local tool (e.g., `rf.scan_roaming`).
4. **Evidence:** emit `report.json`, `metrics.json`, `stamp.json`, and update `evidence/index.json`.

## Scaling constraint captured
MCP tool manifests grow with tool count and schema size. Summit keeps AgentCards compact and routes
by summarized capability to avoid tool manifest expansion in the supervisor context.

## Governed exceptions
Legacy bypasses are treated as **Governed Exceptions**: each exception must be recorded with a
policy rationale, rollback trigger, and evidence reference.

## MAESTRO alignment
- **MAESTRO Layers:** Foundation, Agents, Tools, Security, Observability.
- **Threats Considered:** prompt injection, tool chain escalation, agent spoofing.
- **Mitigations:** deny-by-default allowlists, taint propagation blocking, endpoint allowlists,
  evidence artifacts with deterministic indexing.

## Rollback
Disable interop flags and revert evidence/doc additions to roll back this layer without runtime
impact.
