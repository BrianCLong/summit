# Summit Strategic Moat & Capability Extraction

**Version**: 1.0.0
**Date**: 2025-12-31
**Author**: Jules (Chief Systems Architect)
**Status**: INSTITUTIONALIZED

---

## 1. Capability Extraction Map

This map defines the core capabilities harvested from the Summit platform, their problem space, and their permanent home.

| Capability | Problem Class | Type | Permanent Home |
| :--- | :--- | :--- | :--- |
| **Provenance Ledger V2** | Tamper-evidence, Immutable Audit | Detective / Corrective | `server/src/provenance/ledger.ts` |
| **Policy Engine (OPA)** | Autonomy Safety, Governance | Preventative | `server/src/autonomous/policy-engine.ts` |
| **Agent Lattice (Maestro)** | Multi-Model Orchestration, Cost Opt. | Accelerative | `server/src/maestro/` |
| **Capability Registry** | Unauthorized Agent Action | Preventative | `docs/agents/CAPABILITY_MODEL.md` |
| **Graph-Augmented Gen (GAG)** | Context Loss, Hallucination | Accelerative | `server/src/graph/` |
| **Chain of Verification (CoVe)** | Trust, Accuracy | Detective | `server/src/verification/` |
| **Active Measures Portfolio** | Influence Operations, Defense | Accelerative | `active-measures-module/` |
| **Fail-Closed Gate** | Security Bypass | Preventative | `scripts/ci/provenance_quality_gate.mjs` |

---

## 2. Primitive Canonicalization

Canonical definitions for the core primitives that drive the Summit architecture.

### 2.1 LedgerRoot (Provenance)

**Definition**: A cryptographically signed Merkle root representing a discrete time-window of ledger entries.

- **Inputs**: `TenantID`, `TimeWindow`, `EntryHashes[]`
- **Outputs**: `RootHash`, `Signature` (Cosign), `WORM_Location`
- **Failure Mode**: Signature verification fail -> Chain Halt.
- **Enforcement**: `ProvenanceLedger.createSignedRoot()`

### 2.2 PolicyDecision (Governance)

**Definition**: A deterministic authorization result derived from Context + Policy-as-Code.

- **Inputs**: `AgentIdentity`, `ActionContext`, `ResourceAttributes`
- **Outputs**: `Decision` (Allow/Deny), `Obligations[]` (e.g., Approval Required), `RiskScore`
- **Failure Mode**: Context missing -> Default Deny (Fail-Closed).
- **Enforcement**: `PolicyEngine.evaluate()`

### 2.3 AgentCapability (Identity)

**Definition**: A declarative, immutable permission grant scoped to specific resources and risks.

- **Inputs**: `AgentID`, `CapabilityName` (e.g., `git:write`), `Scope` (Tenant/Project), `RiskLevel`
- **Outputs**: Boolean Authorization
- **Failure Mode**: Registry drift -> Runtime Block.
- **Enforcement**: `EnforcementEngine.checkCanExecute()`

### 2.4 MutationWitness (Audit)

**Definition**: A pre-commit verification step that asserts the validity of a state change before it enters the ledger.

- **Inputs**: `ProposedMutation`, `ActorContext`
- **Outputs**: `WitnessSignature` or `Rejection`
- **Failure Mode**: Witness unavailable -> Mutation Aborted.
- **Enforcement**: `MutationWitnessService.witnessMutation()`

---

## 3. Moat Analysis

Why Summit is defensible and hard to replicate.

### 3.1 The Lattice vs. The Chain

**Competitors**: Use linear "Chains" (LangChain) or simple "Crews". Fragile, brittle, hard to scale.
**Summit**: Uses a **Lattice Architecture**. Agents negotiate tasks based on capability auctions and cost/latency budgets.
**Advantage**: Higher reliability, lower cost, and dynamic adaptation to model failure.

### 3.2 Graph-Augmented Generation (GAG)

**Competitors**: Use Vector RAG (flat similarity search). Loses structural context.
**Summit**: Uses **Graph RAG**. We traverse the knowledge graph to extract the *topology* of relationships before generation.
**Advantage**: The LLM understands "First-Order" and "Second-Order" effects, not just keyword matches.

### 3.3 Chain of Verification (CoVe)

**Competitors**: Trust the output or use simple "critique".
**Summit**: Implements **Infrastructure-Level CoVe**. High-stakes assertions are automatically routed to a *different* model family (e.g., GPT-4 generates, Claude verifies) for adversarial audit.
**Advantage**: Drastically reduced hallucination rates in high-stakes intel reports.

---

## 4. Systemization Plan

Moving from "Heroics" to "Systems".

| Manual / Brittle Process | Systemization Solution | Owner | Artifact |
| :--- | :--- | :--- | :--- |
| **Evidence ID Generation** | Automate via `provenance-integrity-gateway` on every CI run | CI/Ops | `evidence_manifest.json` |
| **Risk Scoring (Reviews)** | Automate via `PolicyEngine` scoring logic (0-100 scale) | Governance | `risk_ledger.json` |
| **Agent Approval** | Move from Slack/Jira to `ApprovalService` (API-driven) | Governance | `agent_approvals` table |
| **Schema Migration** | Automate via `SchemaEvolutionAgent` (with Witness) | DB/Ops | `schema_provenance.log` |
| **Prompt Optimization** | Automate via `PromptOptimizer` (A/B Testing in Lattice) | AI Ops | `prompt_perf_metrics.json` |

---

## 5. Governance Hardening

Rules to ensure the system cannot regress.

### 5.1 The Fail-Closed Mandate

- **Rule**: If a registry lookup fails, a policy errors, or a service times out, the result is **ALWAYS DENY**.
- **Enforcement**: Baked into `EnforcementEngine` and `PolicyEngine` catch blocks.

### 5.2 The 3-Layer Defense

1. **Pre-Execution**: Registry Lookup + Policy Check (Can I start?)
2. **Runtime**: Resource Limits + Timeout + Budget (Am I behaving?)
3. **Post-Execution**: Audit Log + Drift Detection (Did I do what I said?)

### 5.3 Immutable Identity

- **Rule**: Agents cannot change their own capabilities or identity.
- **Enforcement**: The `AgentRegistry` is read-only to the agent runtime. Updates require a PR to `agents/registry.yaml` with human approval.

---

## 6. Narrative & Intelligence Moat

Translating research into defensible product claims.

### 6.1 Unattributable Active Measures

**Insight**: Intelligence work requires "plausible deniability" and "noise generation".
**Productization**: The `active-measures-module` provides a portfolio of noise-generation and "chaff" agents that obscure true intent.
**Moat**: Competitors focus on "clean" data; Summit masters "weaponized" data environments.

### 6.2 Topological Intelligence

**Insight**: Truth is not in the node, but in the edge (relationship).
**Productization**: "Graph-Aware Prompts" encode centrality and community structure into the LLM context.
**Moat**: We sell "Structural Insight," not just "Search Results."

### 6.3 The "Memory Plane"

**Insight**: Context windows are ephemeral; organizational memory must be durable.
**Productization**: Hierarchical Memory System (Episodic + Semantic + Procedural) shared across the Agent Lattice.
**Moat**: Summit agents "learn" from each other's sessions, creating a compounding data asset competitors cannot scrape.

---

### Institutionalized by Jules, Chief Systems Architect
