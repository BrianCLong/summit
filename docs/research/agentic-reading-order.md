# Summit Agentic AI Reading Order + What To Steal

## Summit Readiness Assertion Alignment

Summit operates under the active readiness posture defined in `docs/SUMMIT_READINESS_ASSERTION.md`, so the readings below are mapped to policy-gated autonomy, provenance-first operations, and CI-enforced invariants. This list converts research inputs into governed, evidence-producing deliverables rather than open-ended exploration.

## Reading Order (4 papers)

### 1) “The Path Ahead for Agentic AI: Challenges and Opportunities”

**Why first:** Establishes the cleanest systems map of agentic components and gaps; it mirrors Summit’s autonomy-plus-governance posture.

**Steal for Summit:**

- **Canonical agent reference model:** perception → planning → memory → tool execution → reflection, but make it **policy-gated + provenance-first** as the Summit variant.
- **Roadmap priorities as epics:** verifiable planning, scalable multi-agent coordination, persistent memory, governance frameworks — convert into GA gates with explicit evidence outputs.

### 2) “The Evolution of Agentic AI Evaluation” (LessWrong)

**Why second:** Identifies real-world failure modes (syntax/env/tool interactions) that directly block GA reliability.

**Steal for Summit:**

- **Environment-friction minimizer:** strict command schemas, argument validators, tool-option autocomplete, dry-run capability, and an execution shim that normalizes shell/tool variance.
- **Eval harness principle:** score **trace quality** (invalid command rate, recovery rate, tool misuse rate, rollback success) not just task success.

### 3) “Agentic Memory (AgeMem)”

**Why third:** Turns memory operations into explicit actions, which is directly implementable within Summit’s provenance model.

**Steal for Summit:**

- **Memory ops as typed tools:** store/retrieve/update/summarize/discard so they are observable, testable, and policy-enforceable.
- **Unified STM + LTM mental model:** manage working context and long-lived memory as one surface with explicit actions.
- **Provenance-rich writes:** every memory write/update carries evidence (why written, source refs, sensitivity tags) for compliance and review.

### 4) “Towards Verifiably Safe Tool Use for LLM Agents”

**Why fourth:** Converts agent safety into enforceable specs, aligning with Summit’s governance-first architecture.

**Steal for Summit:**

- **Safety engineering → formal SPEC pipeline:** derive requirements via hazard analysis (e.g., STPA) and translate to enforceable constraints (information-flow + temporal logic).
- **Independent enforcement:** intercept every tool call outside the model via policy engine so rules cannot be bypassed.
- **Augmented MCP labeling as contract:** require capability/confidentiality/trust tags on tools + data so policies can deterministically block/allow/require confirmation.
- **Formal verification as differentiator:** model-check augmented MCP in Alloy to prove unsafe flows are impossible under the spec; ship as release evidence.

## Optional High-Leverage Addition (Governed Exception)

### 5) “BackdoorAgent: A Unified Framework for Backdoor Attacks on LLM-based Agents”

**Why optional:** Provides stage-aware attack coverage for planning/memory/tool layers and a benchmark across agent app types. This is a **Governed Exception** pending security capacity allocation.

**Steal for Summit:**

- **Stage-aware threat model + red-team harness:** treat planning, memory, and tool layers as separately taintable; instrument traces to detect propagation.
- **Trigger persistence metric:** track persistence across memory writes/reads and tool outputs in evals.

## What To Steal — Mapped to Summit Modules

- **Memory design (AgeMem-inspired):** memory operations as typed tools + provenance-rich writes.
- **Governance & tool safety (Verifiably Safe Tool Use):** MCP-required labels + external policy engine + spec proofs + evidence bundles.
- **Eval harness (Evolution of Evaluation):** environment friction minimization and trace-quality metrics.
- **MAS topology (Path Ahead framing):** scale to multi-agent only where it improves outcomes; otherwise use a strong single-agent core with specialized micro-agents behind policy gates.
- **Security testing (BackdoorAgent optional):** stage-aware backdoor benchmarking + propagation detection, deferred pending resourcing.

## Next Concrete Step

Produce a single “Agent Stack vNext” implementation plan with 6–10 atomic PR prompts (memory tools, MCP label contract, policy interceptors, trace schema, eval harness, backdoor red-team suite). This is a controlled execution package aligned to the Summit Readiness Assertion and enforced governance posture.

## 23rd Order of Imputed Intention (Summit Mandate)

Translate every reading outcome into enforced intent: policy-gated autonomy, provenance-first memory, and trace-quality metrics are **non-optional** governance rails. Any deviation is a **Governed Exception** that must ship with recorded evidence, explicit scope, and CI-verifiable constraints.
