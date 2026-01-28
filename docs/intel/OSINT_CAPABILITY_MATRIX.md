# OSINT Capability Matrix (Automation Turn 5)

**Date:** 2026-01-27
**Context:** Synthesis of Maltego, i2 Analyst's Notebook, and emerging intelligence platform developments vs. Summit Intelligence Foundry.

## 1. High-Level Capability Mapping

| Capability Family | Feature / Requirement | External Signal (Maltego, i2, 1 TRACE, etc.) | Summit Intelligence Foundry | Strategic Position |
| :--- | :--- | :--- | :--- | :--- |
| **Collection & Ingestion** | **Multi-Source Fusion** | Maltego One (120+ providers), ShadowDragon (Dark web/Social). | `OSINTEnrichmentService` + Governed Connectors. | **Parity / Target.** Summit prioritizes high-signal governed feeds over raw quantity. |
| | **Real-Time Monitoring** | Maltego Monitor (Social), Semantic Visions (Risk/Media). | `Maestro` Real-Time Streams + `AlertingService`. | **Superior.** Summit's event-driven architecture enables lower latency triggers. |
| | **Blockchain / Financial** | 1 TRACE blockchain tracing. | `BlockchainEnrichmentProvider` (Target). | **Gap.** Summit requires specialized financial/crypto adapters. |
| **Analysis & Reasoning** | **Link Analysis (Graph)** | Maltego Graph, i2 Analyst's Notebook (Relational insights). | `IntelGraph` (Native Neo4j) + `Graph-XAI`. | **Superior.** Summit is graph-native with explainable AI, not just a viz layer. |
| | **Timeline / Pattern** | i2 Timeline analysis, network pattern recognition. | `BitemporalTimeMachine` + `GNNPredictor`. | **Superior.** Bitemporal tracking allows "as-of" analysis that incumbents lack. |
| | **AI-Assisted Transforms** | Maltego's "Guided Transforms" (Roadmap). | `Maestro` Multi-Agent Orchestration + `NL2Cypher`. | **Superior.** Summit uses autonomous agents with policy gates for complex reasoning. |
| **Evidence & Governance** | **Evidence Capture** | Maltego Evidence, Case Management. | `ProvenanceLedger` + `EvidenceBundle`. | **Absolute.** Summit's cryptographic evidence IDs are the industry benchmark. |
| | **Policy Enforcement** | Basic RBAC in most platforms. | **OPA (Policy-as-Code)** embedded in data plane. | **Absolute.** No competitor has real-time, policy-gated tool execution. |
| | **Compliance (ISO/SOC)** | 1 TRACE (ISO 27001), Security certifications. | **Compliance-by-Construction** (SOC2/ISO/NIST mapping). | **Absolute.** Summit automates compliance artifacts via evidence bundles. |
| **Workflow & Experience** | **Browser-Native** | Maltego One, 1 TRACE (Web-based). | `IntelGraph` UI, Maestro Console. | **Parity.** Industry standard is now web-native. |
| | **Case Management** | Maltego Cases, i2 ecosystem. | `CaseOps` Module + `Maestro` Task Orchestration. | **Parity.** Summit integrates cases with autonomous agent activity. |

## 2. Competitive Pivot Points

### Maltego Technologies GmbH (Maltego Platform)
- **Their Move:** Transitioning to "Maltego One" (Browser-native) and focusing on "AI-enabled automation."
- **Summit Counter:** We skip the "transition" and deliver **Governed Autonomy**. Maltego is a tool for humans; Summit is an environment for **Human-Agent Teaming**.

### i2 Analyst’s Notebook
- **Their Move:** Anchoring on deep analytic reasoning and timeline analysis for institutional users.
- **Summit Counter:** We subsume their timeline analysis via our **Bitemporal Ledger**. We move the value from "manual link analysis" to "automated graph reasoning with XAI."

### Emerging Platforms (1 TRACE, ShadowDragon, Semantic Visions)
- **Their Move:** Specialization in niche domains (Blockchain, Risk Analytics, Dark Web).
- **Summit Counter:** We provide the **Foundry Infrastructure** where these specialized tools can be integrated as "Governed Tools" via the MCP (Model Context Protocol).

## 3. Summit "Intelligence Foundry" Action Plan

1. **Refactor OSINT Enrichment**: Ensure `OSINTEnrichmentService` propagates `Evidence-ID` for every external signal. (In-Progress)
2. **Standardize OSINT Evidence**: Implement `osint_evidence.schema.json` to handle multi-domain provenance (Social, Cyber, Media). (Next Step)
3. **Agentize Collection**: Deploy specialized `OSINTCollector` agents that operate under OPA-gated "Search" and "Evidence" policies. (Next Step)
4. **Moat Expansion**: Publish `SUMMIT_VS_OSINT_PLATFORMS.md` to define the "Truth Moat" for enterprise and national security customers. (Next Step)

---
**Status:** DRAFT (Automation Turn 5 Synthesis)
**Evidence-IDs:** EVID-OSINT-TURN-005, EVID-INTEL-FOUNDRY-2026-01-27
**Status:** GREEN
