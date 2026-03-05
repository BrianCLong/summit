# Eclipse Strategy: SpiderFoot & Recorded Future Parity Matrix

## 1. Executive Summary: The "Eclipse" Strategy
Our objective is to dominate the market currently split between tactical OSINT scanners (SpiderFoot) and enterprise threat intelligence platforms (Recorded Future). To do this, Summit CompanyOS must achieve baseline feature parity while introducing an insurmountable strategic moat: **Provable, Graph-Native, Evidence-Gated Intelligence**.

*   **Target ICP for "Eclipse":** Enterprise Threat Intelligence & Investigations (Legal/Insider Risk)
*   **The Moat:** Actionability + Provability (Deterministic Evidence Bundles + Run-to-Run Reproducibility)

## 2. Competitor Parity Matrix

| Capability Area | SpiderFoot (OSINT Scanner) | Recorded Future (Enterprise CTI) | Summit CompanyOS (Current State) | Parity Gap & Target State |
| :--- | :--- | :--- | :--- | :--- |
| **Collection & Modules** | 200+ Open Source Modules | Massive Licensed/Dark Web + Open | Core connectors via MCP | **Gap:** Mass source integration.<br>**Target:** Parity Kernel + MCP-first "Bring Your Own Integration" architecture. |
| **Data Structure** | Event-based correlations | proprietary scoring/graphs | Graph-native entity resolution | **Advantage:** Summit's Neo4j base allows for true persistent identity vs. just event logging. |
| **Analysis & Alerting** | Static Correlation Rules (37) | Dynamic Risk Scoring (Opaque) | Agentic scoring (SUI) | **Advantage/Gap:** Needs continuous monitoring (drift detection) and transparent scoring rules. |
| **Evidence & Integrity**| Fleeting logs / outputs | Linked evidence (closed system) | Deterministic Lineage | **Moat:** Cryptographic signatures for chain-of-custody, EVID tags, run-to-run diffs. |
| **Integration Surface** | CLI/Web/Docker, CSV/JSON | Deep SIEM/SOAR/EDR plugins | Native MCP / API | **Gap:** Bi-directional enrichment for common enterprise tools (Ticketing, SIEM). |
| **Workflow** | Scanner Output | Threat Landscapes & Alerts | Subsystem workflows | **Gap:** Case-first investigation UX, executive reporting. |

## 3. The "Parity Kernel" (Minimal Viable Parity)

To compete in enterprise bake-offs, we must deliver these table-stakes features:

1.  **Module Ecosystem SDK:** A standardized, composable SDK for rapid integration of new data sources, mimicking SpiderFoot's breadth but built on MCP.
2.  **Continuous Drift Detection:** Scheduled runs that identify "what changed" since the last snapshot, moving beyond point-in-time scanning.
3.  **Enterprise Integrations:** Bi-directional stubs for major SIEM/SOAR and Ticketing systems (e.g., Jira, ServiceNow).
4.  **Core Modules:**
    *   *Vulnerability Intelligence:* Prioritization based on exploitability + exposure.
    *   *Brand Protection:* Impersonation, domain typosquatting, and leak detection with evidence capture.

## 4. The "Proof Moat" (Our Differentiator)

This is where we win. We do not just provide alerts; we provide *evidence*.

1.  **Evidence-Gated Supply Chain:** Every intelligence claim must be backed by a deterministic artifact (EVID ID).
2.  **Run-to-Run Reproducibility:** Hash-stable outputs guaranteeing that identical inputs yield identical reports, crucial for audit and legal defensibility.
3.  **Provable Signatures:** Verifiable signatures for the entire chain-of-custody of an investigation.
4.  **Case-First UX:** Moving from "alerts" to "investigations," providing a collaborative environment for analysts to build hypotheses and generate executive reports.
