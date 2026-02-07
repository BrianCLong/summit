# MCP Agent Fabric Subsumption Brief (2026-02)

## Intent (present posture)
Summit is positioned as an **MCP-first, policy-enforced, evidence-producing agent fabric**. This brief translates the current market signals into a governed execution plan aligned to Summit readiness and governance authority files. The decisions here are intentionally constrained to keep the golden path green and evidence-first. Reference posture: `docs/SUMMIT_READINESS_ASSERTION.md`.【F:docs/SUMMIT_READINESS_ASSERTION.md†L1-L200】

## Authority alignment (non-negotiable)
All definitions, decisions, and execution gates must align to:
- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/AGENT_MANDATES.md`
- `docs/ga/TESTING-STRATEGY.md`
- `agent-contract.json`

## Evidence ingest (sourced, current state)
1. Amazon Ads MCP server ships workflow-orchestrating tools beyond raw endpoints, establishing MCP as workflow fabric.
2. GitHub Agent HQ adds multi-agent provider selection with in-product context + review persistence.
3. Xcode 26.3 exposes IDE actions via MCP for compatible agents/tools and includes visual verification loops.
4. OpenAI Frontier positions shared context, onboarding, and permissioned execution as an enterprise agent platform.
5. MCP security analysis identifies protocol-level weaknesses and proposes mitigation extensions.

## Relevance triage (0–5)
- MCP interoperability in real products: **5**
- Multi-agent orchestration: **5**
- Enterprise governance + shared context: **4**
- MCP security & governance differentiation: **5**
- Context engineering as platform capability: **4**

## Subsumption decision
**INTEGRATE + COMPETE**
- **Integrate** MCP as the default connector interface with MCP Apps-style interactive returns.
- **Compete** on verifiable governance, secure execution, deterministic evidence, and graph-scale context engineering.

## Summit posture (dictate the future)
**MCP-first, policy-enforced, evidence-producing agent fabric**
- **Context Plane**: Compiles deterministic context manifests from graph entities + governance labels.
- **Governance Plane**: Signs, audits, and constrains every tool invocation (policy-as-code).
- **Evidence Kit**: Produces `report.json`, `metrics.json`, and `stamp.json` per run.

## Reference architecture (target state)
### 1) `context-plane`
- **Inputs**: intent, workspace state, Summit graph entities, retrieval results.
- **Outputs**: deterministic context manifest + immutable context bundle.
- **Rules**: stable ordering, stable IDs, explicit truncation policy.

### 2) `mcp-fabric`
- MCP client runtime, server registry, tool schema normalization.
- Supports MCP Apps-like rich responses (renderable UI specs).

### 3) `policy-engine`
- Allowlists, argument constraints, egress rules, approval gates.
- Enforces “no silent destructive actions,” with human-in-the-loop thresholds.

### 4) `evidence-kit`
- Evidence artifacts: `report.json`, `metrics.json`, `stamp.json`.
- Required in CI for every PR stack.

## Summit advantage (impossible-for-them features)
1. **Graph-Scoped Context Compiler (GSCC)**
   - Context manifests derived from graph relationships + governance labels.
   - Deterministic canonicalization as a gating rule.
2. **Policy-Proven Tool Calls (PPTC)**
   - Every tool invocation carries a signed capability token + policy decision record.
3. **Multi-Agent Proof-Carrying Handoff**
   - Agent handoffs include context manifest hash, evidence IDs, and unresolved risks.

## Security posture (Summit Secure MCP)
### Threats
- Server-side prompt injection via bidirectional sampling.
- Capability spoofing (server claims broad permissions).
- Implicit trust propagation across multiple MCP servers.

### Mitigations
- **Capability attestation**: signed capabilities verified by a gateway.
- **Origin authentication**: message envelopes signed at gateway boundary.
- **Trust segmentation**: per-server isolation; no automatic delegation.
- **Human-in-the-loop**: UI confirmations for destructive actions.

## Evidence & determinism gate (non-negotiable)
**Stable Evidence ID pattern**
`EVID::<product>::<yyyy-mm-dd>::<pipeline>::<gitsha8>::<runid8>`

**Required artifacts per PR**
- `evidence/report.json`
- `evidence/metrics.json`
- `evidence/stamp.json`

**Determinism checks**
- Canonicalized context manifest (stable sort + stable truncation).
- Replay mode: same inputs → identical `stamp.json` except timestamp.

## MAESTRO alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: prompt injection, tool abuse, capability spoofing, trust propagation.
- **Mitigations**: policy-as-code gates, signed capabilities, evidence logging, isolated tool registry.

## Execution plan (PR stack)
1. **PR1 — MCP Fabric Baseline**
   - `mcp-fabric/client/`
   - `mcp-fabric/registry/servers.yaml`
   - `mcp-fabric/normalize/tool_schema.ts`
   - Gate: `ci/check_mcp_contracts`
   - Eval: `evals/mcp_smoke_eval.py`
   - Docs: `docs/architecture/mcp-fabric.md`

2. **PR2 — Context Plane: Context Manifest v1**
   - `context-plane/manifest/schema.json`
   - `context-plane/compiler/compile.ts`
   - `context-plane/compiler/truncation_policy.ts`
   - Gate: `ci/check_context_manifest_determinism`
   - Eval: `evals/context_recall_eval.py`
   - Docs: `docs/architecture/context-plane.md`

3. **PR3 — Secure MCP Gateway (Attestation + Policy Enforcement)**
   - `secure-mcp-gateway/`
   - `policy-engine/rules/`
   - `policy-engine/decision_record/`
   - Gate: `ci/security_mcp_injection_suite`
   - Eval: `evals/mcp_injection_eval.py`
   - Docs: `docs/security/secure-mcp.md`

4. **PR4 — Interactive Surfaces (MCP Apps-like UI returns)**
   - `ui/agent_surfaces/renderers/`
   - `mcp-fabric/ui_return_contract.ts`
   - Gate: `ci/ui_contract_snapshots`
   - Eval: `evals/ui_confirmation_eval.py`
   - Docs: `docs/product/interactive-agent-surfaces.md`

5. **PR5 — Multi-Agent Orchestrator + Proof-Carrying Handoff**
   - `orchestrator/router.ts`
   - `orchestrator/handoff/contract.jsonschema`
   - `orchestrator/handoff/verify.ts`
   - Gate: `ci/handoff_contract_enforced`
   - Eval: `evals/multi_agent_handoff_eval.py`
   - Docs: `docs/architecture/orchestrator.md`

## Implementation invariants (compress the timeline)
- MCP is the default connector interface.
- All tool calls are policy-evaluated, signed, and evidence-logged.
- No silent destructive actions.
- Every PR produces evidence artifacts and deterministic manifests.

## Finality statement
Execution proceeds through the PR stack above with evidence-first outputs and governance alignment. No open ends.
