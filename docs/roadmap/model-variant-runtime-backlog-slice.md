# Model Registry v2 + Variant Router + grounded_search + Telemetry

## Authority & alignment

- **Summit Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md` is the readiness floor and supersedes this slice.
- **Governance:** `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, and `docs/governance/AGENT_MANDATES.md` are binding for policy-as-code, compliance logging, and decision traceability.
- **GA guardrails:** `docs/ga/TESTING-STRATEGY.md` and `docs/ga/LEGACY-MODE.md` define verification tiers and legacy constraints.
- **Agent contract:** `agent-contract.json` is authoritative for runtime agent limits.

This slice enforces a single definition of **model** (capabilities + limits) and **variant** (runtime profile) across registry, routing, telemetry, and UI to ensure alignment and auditability.

## Scope statement

Deliver a model registry schema that treats variants as first-class runtime profiles, a policy- and telemetry-driven variant router, a grounded_search tool that isolates provider search constraints, and end-to-end observability for variant outcomes.

## 23rd-order implication ladder (compressed)

1. Model identity stability prevents catalog sprawl and preserves pricing/legal continuity.
2. Variant profiles enable runtime quality tuning without new model approvals.
3. Provider-neutral reasoning contracts normalize heterogeneous options across vendors.
4. Normalization enables consistent evaluation and policy enforcement.
5. Policy enforcement enables governance-aligned cost/risk controls.
6. Cost/risk controls enable predictable SLO adherence for critical workflows.
7. SLO adherence enables reliable multi-agent orchestration.
8. Orchestration reliability increases task success and reduces retries.
9. Fewer retries improves latency and budget adherence.
10. Improved budget adherence increases capacity for high-criticality work.
11. Telemetry captures variant efficacy, enabling evidence-based routing.
12. Evidence-based routing enables safe automation of the AUTO variant.
13. AUTO reduces operator burden and prevents misconfiguration drift.
14. Drift reduction improves auditability and compliance posture.
15. Compliance posture reduces gated exceptions and accelerates approvals.
16. Faster approvals increase release velocity for agent upgrades.
17. Release velocity enables faster provider feature adoption.
18. Feature adoption maintains parity with competitor capabilities.
19. Parity enables focus on Summit-specific differentiation (governed routing).
20. Differentiation improves retention via reliable cost/quality control.
21. Retention improves telemetry volume and experiment power.
22. Experiment power increases signal for A/B and bandit routing.
23. Stronger routing signals reinforce the governance loop and stabilize long-term operational economics.

## Epic 1: Model Registry v2 (Variants as first-class runtime profiles)

### Goal

A stable model identity with provider-neutral capability/limit definitions and per-model variant profiles that compile into provider-specific options.

### Stories

1. **Registry schema v2**
   - **Description:** Add `variants` to model catalog entries alongside `model_id`, `limits`, and `modalities`.
   - **Acceptance criteria:**
     - Schema supports named variants: `minimal`, `low`, `medium`, `high`, `max`, `auto`.
     - Each variant includes `reasoning` config with `mode` + `level|budget` + `include_thoughts`.
     - Lintable schema validation fails on unknown variant names and unsupported reasoning modes.

2. **Provider compilation layer**
   - **Description:** Compile internal reasoning shape to provider-specific configs.
   - **Acceptance criteria:**
     - Gemini: emits `thinkingConfig.thinkingLevel` for level-based variants.
     - Claude: emits numeric `thinkingBudget` where budgeted variants are selected.
     - Unsupported combinations return actionable errors and are logged for compliance review.

3. **Capability flags**
   - **Description:** Add capability flags to indicate tool-interleaved thinking and search/tool separation constraints.
   - **Acceptance criteria:**
     - `capabilities.think_between_tools` toggles tool-call interleaving.
     - `capabilities.requires_isolated_search` forces grounded_search sub-requests.
     - Capability flags are validated during model selection.

### Implementation notes

- Preserve model identity stability; variants never fork `model_id`.
- Any provider exception is labeled a **Governed Exception** with explicit constraints.

## Epic 2: Variant Router (Policy + Telemetry driven)

### Goal

An AUTO variant that chooses minimal/low/medium/high/max using policy-as-code and live telemetry.

### Stories

1. **Routing policy in OPA**
   - **Description:** Implement OPA policy for variant selection.
   - **Acceptance criteria:**
     - Policy inputs include task type, diff size, retry count, latency SLO, and budget remaining.
     - Policy denies `max` unless role is trusted or pipeline is an approved gate.
     - All policy decisions are logged for compliance review.

2. **Planner classification hook**
   - **Description:** Classify tasks to guide variant selection.
   - **Acceptance criteria:**
     - Planner emits task category (e.g., summarize, plan, debug, refactor).
     - Router maps category to baseline variant before policy refinement.

3. **Per-agent defaults**
   - **Description:** Configure agent-specific default variants.
   - **Acceptance criteria:**
     - `document-writer` defaults to `minimal`.
     - `crawler` defaults to `low`.
     - `principal-architect` defaults to `high`.
     - Defaults can be overridden by policy.

### Implementation notes

- Any override path is explicit, logged, and auditable.
- Router outputs the effective variant + reasoning config for telemetry.

## Epic 3: grounded_search tool (Provider constraint isolation)

### Goal

A grounded search tool that executes as a separate sub-request and returns cited, structured evidence.

### Stories

1. **grounded_search tool contract**
   - **Description:** Define a tool output with sources + snippets and an evidence bundle.
   - **Acceptance criteria:**
     - Tool always executes as isolated provider request.
     - Response includes citations suitable for inline markdown.
     - Tool output is attached to the main agent context.

2. **Search/tool-call separation**
   - **Description:** Enforce separation for providers that cannot mix search and function calls.
   - **Acceptance criteria:**
     - Router detects `capabilities.requires_isolated_search` and uses grounded_search.
     - Main request contains only custom tools after grounding.

3. **Interleaved thinking support**
   - **Description:** Enable think-between-tool-calls when supported.
   - **Acceptance criteria:**
     - Capability flag enables interleaving for tool-heavy flows.
     - Behavior is recorded in telemetry.

## Epic 4: Variant Observability + A/B Harness

### Goal

Telemetry and experiments that quantify variant impact on cost, latency, and task success.

### Stories

1. **Telemetry schema**
   - **Description:** Log model_id, variant, reasoning config, toolset, latency, tokens, and pass@k.
   - **Acceptance criteria:**
     - Metrics are emitted for every request.
     - Traces include variant decision path and policy evaluation result.

2. **A/B compare command**
   - **Description:** Run same prompt against two variants and score outcomes.
   - **Acceptance criteria:**
     - CLI command runs `low` vs `high` and outputs diff + score.
     - Results persisted for evaluation reports.

3. **UI speed/quality slider**
   - **Description:** Map `Fast/Balanced/Deep/Max` to variant names per provider.
   - **Acceptance criteria:**
     - UI displays predicted cost/latency deltas based on telemetry.
     - Mapping is configurable in model catalog.

## Non-functional requirements

- **Policy-as-code compliance:** All routing decisions are enforceable by OPA.
- **Auditability:** Every variant decision is traceable to policy input + output.
- **Performance:** Variant selection should be constant-time relative to request size.
- **Security:** No tool call mixes untrusted search data without grounding.

## Test plan (Tiered)

- **Tier A:** Policy unit tests for variant routing; capability flag validation tests.
- **Tier B:** Integration tests for provider compilation; grounded_search isolation tests.
- **Tier C:** E2E workflow tests for tool-heavy flows with interleaved thinking.

## Risks & mitigations

- **Provider feature drift** → Mitigation: provider compilation tests and capability flags.
- **Policy gaps** → Mitigation: OPA test coverage + policy change review.
- **Telemetry cost** → Mitigation: sampling for non-critical paths.

## Evidence outputs

- Telemetry dashboards showing variant distribution and pass@k.
- Policy decision logs for compliance review.
- A/B experiment reports archived for governance.

## Next actions (compressed loop)

1. Approve schema and policy changes in governance.
2. Implement registry schema + compiler.
3. Implement OPA routing and grounded_search.
4. Ship telemetry + A/B harness.

## Forward-leaning enhancement (state of the art)

Add **adaptive variant scheduling** that learns per-repo optimal variants by task type, using a lightweight bandit that respects OPA constraints and emits policy-safe recommendations only.
