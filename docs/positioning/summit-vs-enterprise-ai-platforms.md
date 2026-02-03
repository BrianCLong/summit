# Summit vs. Enterprise AI Platforms: Competitive Positioning

**Date:** 2026-01-25
**Classification:** INTERNAL ONLY
**Target Audience:** Founders, Executives, Auditors

## Executive Summary
While Microsoft, Palantir, and Dataiku are racing to add governance as a feature set, Summit is **governance-native by design**. We operate at the evidence and execution layer, not just the UI or request layer. Our moat is built on **determinism, portability, and verifiable evidence**.

---

## 1. Why "Governance-Native" Matters
Competitors "bolt on" governance through dashboards and retrospective auditing. Summit's architecture prevents ungoverned actions before they happen.

*   **Summit Advantage**: Every tool call and reasoning step in our agent runtime is evaluated against OPA policies *in real-time*.
*   **The Competitor Gap**: Most platforms log actions after the fact, relying on retrospective content moderation which is "too little, too late" for high-stakes intelligence.

---

## 2. Evidence Determinism vs. Probabilistic Dashboards
Microsoft Purview and Dataiku provide beautiful dashboards based on probabilistic classifications (e.g., "70% likely to be PII"). Summit relies on **Deterministic Evidence IDs**.

*   **Why it matters**: For an auditor or regulator, a probabilistic score is not a defensible proof. An Evidence ID linked to a cryptographically signed artifact is.
*   **Summit Moat**: We eliminate non-deterministic data (timestamps, ephemeral IDs) from our primary governance artifacts, enabling **Audit Replay**.

---

## 3. Agent Observability: Beyond Tracing
Platforms like Azure AI Foundry offer "traces" (what happened). Summit offers **Agent Execution Proofs (AEP)** (why it was allowed to happen and proof of correctness).

*   **Observability without Replay is Insufficient**: If you cannot replay an agent's reasoning path deterministically, you cannot prove its safety to a regulator.
*   **Summit Moat**: Our AEP bundles capture the complete reasoning-path integrity, allowing auditors to verify agent behavior without accessing the underlying model or data.

---

## 4. Portability: Sovereignty in a Multi-Cloud World
Microsoft Purview is locked to Azure. Palantir Foundry is often a proprietary cloud silo. Summit is **Engine-Agnostic and Cloud-Portable**.

*   **The Moat**: Summit can run in air-gapped, on-prem, or cross-cloud environments while maintaining a unified governance fabric. This is critical for sovereign governments and global banks that cannot trust a single cloud provider with their entire intelligence governance.
*   **Cloud vs. Sovereign Footprint**: While competitors like AWS Neptune expand regional availability (7+ new regions in 2026), they remain bound by the cloud provider's jurisdiction. Summit delivers "Intelligence Anywhere," including disconnected edge environments where cloud-native solutions cannot operate.

---

## 5. Summary Matrix for Sales & Strategy

| Factor | Summit | Enterprise AI Platforms |
| :--- | :--- | :--- |
| **Governance Layer** | Execution & Cognition | UI & API |
| **Trust Model** | Evidence-First (Verifiable) | Heuristic-First (Probabilistic) |
| **Auditability** | Deterministic Replay | Retrospective Logs |
| **Policy Language** | Open Policy Agent (OPA) | Proprietary DSLs |
| **Deployment** | Universal / Air-gapped | Cloud-Locked |

---

## 6. Addressing Emerging "Zero-ETL" Threats
New competitors like PuppyGraph propose "Zero-ETL" analytics on existing data lakes. While this reduces data movement, it bypasses the **Execution-Layer Governance** that Summit provides.

*   **The Gap**: Zero-ETL engines generally lack a deterministic provenance ledger and the ability to enforce policy *at the moment of computation*.
*   **Summit Advantage**: We treat data not just as bytes to be queried, but as evidence to be governed. Our integration of OPA and bitemporal ledgers ensures that intelligence remains audit-ready, a requirement that Zero-ETL engines cannot yet fulfill for regulated domains.

## Conclusion
Summit is not competing on model size or dashboard count. We are competing on **Trust Integrity**. By governing the *reasoning* and *evidence* of AI systems, we provide the only platform that is truly ready for the "Age of Autonomous Liabilities."
