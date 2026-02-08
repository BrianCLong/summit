# Summit vs. Legacy Competitors: The Governance Moat

**Confidential - Internal Strategy**

## 1. The Core Differentiator
Legacy tools (Maltego, Graphika, etc.) focus on **analysis**. Summit focuses on **governed action**.
*   **They sell:** "Here is a graph of the bad guys."
*   **We sell:** "Here is a court-ready evidence chain proving coordination, with a button to disrupt it."

## 2. Feature Teardown

| Feature | Legacy Tools | Summit | Advantage |
|---------|--------------|--------|-----------|
| **Data Model** | Snapshot (Mutable) | Ledger (Immutable) | **Auditability** |
| **Attribution** | Analyst Opinion | Confidence Bands (Algorithm) | **Defensibility** |
| **Risk Model** | Content-based | Systemic (SRI) | **Regulatory Fit** |
| **Response** | None (Export PDF) | Active Measures (Agentic) | **Speed** |

## 3. Kill Points
*   **"Can you replay the investigation from 3 years ago?"** (They can't; we can).
*   **"Is this compliant with EU AI Act Article 9?"** (They aren't; we are natively).

## 4. The Frontier Benchmark (Feb 2026)
**Competitor:** OpenAI Frontier (Agent Control Plane)
**Status:** The new enterprise standard.

| Feature | Frontier | Summit | Gap/Advantage |
| :--- | :--- | :--- | :--- |
| **Context** | Shared Context Layer | IntelGraph (Graph-Native) | **Advantage:** Structured vs. Vector |
| **Identity** | Agent & Tool Permissions | SPIFFE/OIDC + Policy | **Parity:** Must implement strictly |
| **Observability** | Fleet Monitoring | Full Evidence Ledger | **Advantage:** Audit-ready Proof |

**Strategic Implication:** Summit is the **governed control plane** that sits *above* or *alongside* Frontier, enforcing policy across models (OpenAI, Anthropic, etc.). We are not just another agent builder.

## 5. Emerging Threats
*   **Agent Sprawl:** Unmanaged agents creating noise/risk (Deloitte 2026).
*   **"Black Box" Reasoning:** Long-running agents (Codex 5.3) doing work without audit trails.
    *   **Summit Response:** "ContextReceipts" and governed compaction.
