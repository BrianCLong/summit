# Summit Strategy: Kimi K2.5 Subsumption & Advantage Capture

**Date**: 2026-01-01
**Author**: Jules (Release Captain / Lawmaker)
**Status**: DRAFT
**Subject**: Subsuming Moonshot AI's Kimi K2.5 Innovations into the Summit "Intelligence OS"

---

## 1. Executive Summary

Moonshot AI's Kimi K2.5 release signals a shift toward **native multimodal, agentic, and long-horizon** models that scale from local to cloud. Summit will not just "support" these models; we will **subsume** their best ideas—specifically their swarm orchestration, "Thinking vs Instant" modes, and deployment parsers—into our own **governance-first architecture**.

Our strategy is to treat the model as a commodity and the **Summit Agentic OS** as the value-add that provides:
1.  **Verified Conformance** (Does it actually do what they claim?)
2.  **Governed Swarms** (Can it operate safely in parallel?)
3.  **Policy-Aware Compute** (Is it cost-effective and compliant?)

---

## 2. Competitive Pivot: "Steal + Subsume"

| Kimi K2.5 Signal | Summit Subsumption Move | Moat Advantage |
| :--- | :--- | :--- |
| **Flagship-to-Local Scaling** | **Multi-Scale Agent Runtime**: Universal UX/API that routes to local distilled models for low-risk/low-cost tasks and cloud swarms for heavy reasoning. | **Continuity of Capability**: User sees the same agent surface regardless of the "weights" underneath. |
| **Native Multimodal Claims** | **Agent/Model Conformance Suite (SACS)**: Deterministic benchmarks for vision grounding, tool-use fidelity, and cross-modal reasoning. | **Vendor Verifier**: Customers trust Summit's "Signed Conformance Report" over vendor marketing. |
| **Agent Swarm Execution** | **Swarm Runtime Primitives**: First-class *Planner -> Shard -> Execute -> Merge* primitive with explicit OPA-controlled budgets and step caps. | **Auditability**: Every swarm step is recorded in the Provenance Ledger, unlike black-box swarms. |
| **Thinking vs. Instant** | **Reasoning Budget Contract (RBC)**: User-facing knobs for Latency/Cost/Risk that map to model choice, verification strictness, and swarm depth. | **Operational Control**: Cost-aware intelligence that "re-runs heavier" only when confidence is low. |
| **Reasoning/Tool Parsers** | **Agent Protocol Adapter Layer**: Schema normalization across vLLM/SGLang/etc. with built-in "Verified Runtime" badges. | **Ecosystem Integrity**: Summit becomes the "Universal Adapter" that guarantees tool-call correctness. |
| **Native INT4 QAT** | **Policy-Driven Compute Optimization**: Workload-aware precision (INT4 for drafts, FP16 for verification) linked to tenant policy. | **Reproducibility**: Exact inference config stored in provenance; precision becomes a governance choice. |
| **Heterogeneous Recipes** | **Governed Deployment Recipes**: One-click, hardware-aware recipes with integrated audit logs and fine-tuning gates. | **Turnkey Compliance**: Deployment is "Safe-by-Default," not just "Fast-by-Default." |

---

## 3. The "Intelligence OS" Moat

By integrating these features, Summit moves from "running agents" to **"governing the intelligence workforce."**

### 3.1 Vision-in-the-Loop Conformance
We will standardize the definition of "Native Multimodal" as:
- **Grounding**: Vision must guide tool selection (e.g., screenshot -> click coordinate).
- **Consistency**: Multi-turn reasoning must not degrade when visual context is compressed.
- **Robustness**: Tool outputs exceeding context must be pruned according to OPA policy, not random truncation.

### 3.2 The Reasoning Budget Contract
We move beyond "Thinking vs Instant" toggle. Summit's RBC allows an enterprise to set a **$0.50 budget** for a task; the orchestrator then decides:
- Can I use a local distilled model?
- Do I need a 3-agent swarm?
- Is a human-in-the-loop required for the final verification?

---

## 4. Next Steps & Sprint Backlog

See `docs/roadmap/BACKLOG_SPRINT_KIMI_SUBSUMPTION.md` for the prioritized execution plan.
