# OSINT to Summit Alignment Analysis

**Date:** 2026-01-25
**Source:** Automation Turn #4 Signals
**Context:** Comparative analysis of external OSINT platform capabilities vs. Summit architecture.

## Capability Mapping Matrix

| Capability | External Signal (Maltego, i2, 1 TRACE) | Summit Coverage (IntelGraph, Maestro) | Gap Analysis | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **Browser-Native Experience** | Maltego One's "installation-free" shift; 1 TRACE's SaaS model. | **High.** Summit is browser-native by design (`IntelGraph` UI, Maestro Console). No legacy desktop client debt. | **None.** Summit is natively positioned here. | Maintain UI performance for large graph visualizations (Webgl). |
| **Unified Collection + Analysis** | Platforms merging collection (ShadowDragon) with analysis (Maltego) into single "hubs". | **Medium-High.** `OSINTEnrichmentService` pipelines feed `IntelGraph`. Provenance Ledger tracks origin. | **Workflow Friction.** Ensuring seamless handoff between "Collection" (Explore) and "Analysis" (Commit) modes. | Enforce "Collection State" tracking (Automation Turn #5) in UI. |
| **Graph-Based Link Analysis** | Core value proposition of Maltego/i2. Visualizing relationships. | **Superior.** `IntelGraph` is graph-native, not just a visualization layer. Backed by Neo4j + Provenance Ledger. | **None.** Summit's "Graph-First" retrieval is a structural moat. | Double down on "Path-Native" prompting and traversal depth. |
| **Modular Connector Ecosystem** | Reliance on 3rd-party bridges (e.g., Social Links for i2). | **Strategic Moat.** "Integration as a Moat" strategy focuses on governed, bi-directional connectors. | **Connector Volume.** Competitors have hundreds of niche OSINT sources. Summit prioritizes governed, high-signal sources. | Prioritize "high-signal" OSINT connectors over quantity; use `OSINTPipeline` for generic ingestion. |
| **Enterprise Compliance (ISO)** | 1 TRACE citing ISO/IEC 27001:2022. Hosted compliance as a feature. | **Core Moat.** "Compliance & Trust" (Provenance Ledger, OPA, Immutable Logs). | **Certification Artifacts.** Tech exists, but formal mapping to ISO controls for sales collateral might be thin. | Map `ProvenanceLedger` capabilities explicitly to ISO/IEC 27001 controls in sales decks. |

## Strategic Assessment

Summit's architecture anticipates the market shift toward **governed, browser-native intelligence**. While competitors are retrofitting legacy desktop tools (Maltego, i2) or building new SaaS wrappers (1 TRACE), Summit's **"Graph-Native + Provenance-First"** foundation provides a defensible advantage.

**Key Differentiator:** Competitors focus on *visualizing* the graph; Summit focuses on *proving* the graph (Provenance Ledger). This "Truth Moat" is the primary counter-position against "easy" OSINT tools that lack rigorous evidence chains.
