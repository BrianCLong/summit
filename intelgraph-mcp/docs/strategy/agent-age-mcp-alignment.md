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

## Imputed Intention Ladder (23rd Order)

To “keep going strong to the 23rd order of imputed intention,” Summit MCP uses a deterministic intent ladder that progressively constrains tool behavior from explicit requests through higher-order inferred goals. Each order is **intentionally constrained** by policy-as-code, provenance, and least-privilege execution. The ladder is an audit artifact, not a speculative claim.

1. **Order 1 — Stated Intent:** explicit user/tool request text.
2. **Order 2 — Parsed Task:** normalized task intent after schema validation.
3. **Order 3 — Scoped Goal:** request constrained to tenant/session scope.
4. **Order 4 — Policy Gate:** OPA policy allows/denies the task.
5. **Order 5 — Tool Fit:** best-fit tool chosen via capability manifest.
6. **Order 6 — Data Eligibility:** only eligible resources attached.
7. **Order 7 — Provenance Boundary:** source lineage verified and signed.
8. **Order 8 — Risk Tier:** risk classification applied to action.
9. **Order 9 — Budget Constraint:** cost and latency budgets enforced.
10. **Order 10 — Replay Constraint:** deterministic inputs/outputs hashed.
11. **Order 11 — Exception Flag:** deviations logged as Governed Exceptions.
12. **Order 12 — Least-Privilege Envelope:** minimal scopes and credentials.
13. **Order 13 — Transport Parity:** identical semantics across transports.
14. **Order 14 — Integrity Checks:** integrity policies satisfied before run.
15. **Order 15 — Safety Envelope:** tool safety rails engaged.
16. **Order 16 — Observability Contract:** required traces emitted.
17. **Order 17 — Evidence Pack:** artifacts prepared for audit.
18. **Order 18 — Tenant Context:** tenant-specific controls applied.
19. **Order 19 — Multi-Tool Cohesion:** tool chain validated for conflicts.
20. **Order 20 — Replay Verification:** deterministic replay verified.
21. **Order 21 — Intent Diff:** detected drift between orders 1–20.
22. **Order 22 — Governance Review:** flagged drift requires review.
23. **Order 23 — Final Authority:** governed outcome recorded with finality.

## Outcome

This alignment keeps Summit MCP servers deterministic, auditable, and governed while meeting agent-era expectations for composable tool ecosystems and fast capability discovery.
