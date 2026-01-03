# Summit Multi-Agent Design Blueprint

This document translates high-leverage patterns from Cognizant AI Lab's multi-agent guidance and Neuro SAN Studio into concrete Summit actions. It centers on agent modularity, bounded autonomy, and governance-first execution.

## Transferable Design Patterns (Summit mapping)

- **Agent = LLM reasoning + execution layer** — Treat each agent as an LLM planner paired with a deterministic execution adapter that owns tools, retries, and policy gates. Mapped to `LLMRouter` + tool adapters.
- **Dual-channel control plane** — Use natural language for semantic negotiation between agents, and code-level channels for sensitive control/tokens under OPA enforcement. Mapped to OPA policy gateways and audited tool adapters.
- **Modular specialist network** — Compose networks from replaceable specialists bound by capability contracts and registry versions. Mapped to the agent registry and capability contracts.
- **Bounded autonomy** — All tool invocations pass through policy, provenance, and budget controls; no ungoverned execution. Mapped to OPA + provenance ledger + execution budgets.
- **Interoperable/LLM-agnostic orchestration** — Keep orchestration model-neutral with adapter-based tool and model routing. Mapped to `LLMRouter` abstraction and tool protocol adapters.
- **Meta-agent network designer** — A designer agent emits declarative network specs, policies, and eval harness stubs for new workflows. Mapped to a `NetworkDesigner` service and spec generator.
- **Sensitive data “Sly-Data” handoff** — Exchange sensitive payloads as opaque handles scoped to policies; redact raw secrets from prompts. Mapped to secret-handle broker + redaction rules in tool adapters.
- **Traceability-first runs** — Treat each run as a telemetry stream with structured traces, budgets, and failure taxonomy. Mapped to observability pipeline and run console.
- **Governance-by-default** — Default-deny tool access, explicit allowlists, and deterministic adapters. Mapped to policy bundles and adapter scaffolds.
- **Replaceable toolchains** — Ensure specialists and tools can be swapped/upgraded by contract versioning without breaking networks. Mapped to versioned capability schemas.
- **External agent bridge** — Support federated/foreign agents via signed capability manifests and adapter shims. Mapped to an external-agent adapter layer.
- **Safety envelopes for autonomy** — Budget ceilings, rate limits, and escalation triggers around multi-step plans. Mapped to execution controller and observability alerts.

## Summit Architecture Deltas

- **Agent abstraction**: Define agents as `{reasoning (LLM prompt + plan)} + {execution adapter (tool bindings, policy checks, retries, budgets)}`. Contracts must specify required capabilities, inputs/outputs, and governance hooks.
- **Network spec**: Introduce a versioned YAML/JSON spec describing agents, capabilities, tools, policies, channels (NL vs control), and triggers. Store in `docs/agentic/examples/` and enforce schema validation.
- **Governance**: Enforce OPA checks at every tool boundary; log all adapter invocations to the provenance ledger with policy decision records. Require capability receipts for tool access.
- **Sensitive data handling**: Implement secret handles that reference encrypted payloads; prompts only see opaque IDs. Add deterministic redaction filters in adapters, and scoped tokens with expiry.
- **Interop**: Build adapter shims for foreign agents/tools with signed manifests, model-agnostic routing, and protocol translation. Avoid vendor-specific logic inside planners.

## Backlog (grouped and ordered)

### Thin-slice MVP (1–2 days)

1. **Define agent network spec schema (v0.1)**  
   _Acceptance_: JSON Schema checked in `docs/agentic/network-spec.md`; example validates via `scripts/validate-network-spec.ts`.  
   _Touches_: `docs/agentic/`, `scripts/` (new validator).  
   _Risk_: Scope creep on schema fields.
2. **Agent registry entries for core specialists**  
   _Acceptance_: Registry lists planner, retriever, decider with capability versions.  
   _Touches_: `server/src/agents/registry/` or equivalent.  
   _Risk_: Registry format drift.
3. **Helpdesk triage example network**  
   _Acceptance_: Example spec loads and passes schema validation; documented in `docs/agentic/examples/`.  
   _Touches_: `docs/agentic/examples/`.  
   _Risk_: Overfitting to example tools.

### Governance & safety

4. **OPA policy bundle for tool allowlist**  
   _Acceptance_: Tool invocations fail closed without policy permit; decision logged.  
   _Touches_: `security/opa/`, tool adapters.  
   _Risk_: Blocking legacy tools.
5. **Secret-handle broker service**  
   _Acceptance_: API to mint/resolve opaque handles with TTL and audit trail; prompts never receive raw secret.  
   _Touches_: `server/src/security/`, `docs/agentic/security.md`.  
   _Risk_: Handle leakage if logs misconfigured.
6. **Adapter-level redaction filters**  
   _Acceptance_: Redaction applied before LLM calls; tests cover PII/secret patterns.  
   _Touches_: `server/src/tools/adapters/`.  
   _Risk_: Over-redaction harming utility.
7. **Capability receipts for tool access**  
   _Acceptance_: Tool calls require signed receipt referencing policy decision + actor.  
   _Touches_: `server/src/tools/`, provenance ledger.  
   _Risk_: Receipt store consistency.
8. **Budget + rate-limit envelopes**  
   _Acceptance_: Per-run ceilings enforced; overruns logged with taxonomy code.  
   _Touches_: execution controller, telemetry.  
   _Risk_: False positives on long tasks.

### Observability

9. **Structured trace schema for agent runs**  
   _Acceptance_: Schema documented; emitted spans include agent ID, tool, policy decision, tokens, latency.  
   _Touches_: `observability/`, run console.  
   _Risk_: Cardinality explosion.
10. **Run timeline viewer**  
    _Acceptance_: UI timeline shows steps, decisions, tool calls, budgets; pulls from traces.  
    _Touches_: `web/` or `ui/`, telemetry API.  
    _Risk_: Data volume performance.
11. **Failure taxonomy + alerting**  
    _Acceptance_: Standard codes for policy_denied, redaction_block, budget_exceeded, interop_error; alerts wired to SLOs.  
    _Touches_: `docs/agentic/security.md`, observability config.  
    _Risk_: Alert noise.
12. **Golden trace replay harness**  
    _Acceptance_: Ability to replay saved traces to validate determinism/policies; documented steps.  
    _Touches_: `sim-harness/` or `tests/agentic/`.  
    _Risk_: Trace drift vs production.

### Network designer

13. **NetworkDesigner meta-agent prompt + service**  
    _Acceptance_: Service takes use-case text → emits spec + policy stubs + eval outline.  
    _Touches_: `server/src/agents/designer/`, `prompts/`.  
    _Risk_: Hallucinated capabilities.
14. **Policy stub generator**  
    _Acceptance_: Designer outputs OPA/Rego scaffolds with default-deny.  
    _Touches_: `security/opa/templates/`.  
    _Risk_: Template mismatch with runtime.
15. **Eval harness skeleton for new networks**  
    _Acceptance_: Designer emits harness config referencing golden traces and assertions.  
    _Touches_: `tests/agentic/`, `docs/agentic/eval-harness.md`.  
    _Risk_: Flaky assertions.
16. **Interop adapter template for external agents**  
    _Acceptance_: Template supporting signed capability manifest + token scoping; documented bridging flow.  
    _Touches_: `server/src/tools/adapters/external/`.  
    _Risk_: Inconsistent external protocols.

## Draft docs and artifacts

- `docs/agentic/network-spec.md` — schema, fields, examples, and validation guidance.
- `docs/agentic/security.md` — secret handles, redaction, OPA gates, receipts, and failure taxonomy.
- `docs/agentic/examples/helpdesk-triage.yaml` — end-to-end triage workflow example.
- `docs/agentic/eval-harness.md` — golden traces, replay, and regression assertions.

## Guardrails (non-negotiable)

- Default-deny policies; every tool call is policy-checked and logged with a receipt.
- Opaque secret handles only; LLMs never see raw secrets.
- Model-agnostic routing for all orchestration and adapters.
- Prefer composable primitives and versioned contracts over large rewrites.
