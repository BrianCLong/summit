# Financial Services (FS) Parity Matrix: Summit vs. Recorded Future

**Context:** This document outlines the comparative posture of Summit CompanyOS against Recorded Future (RF) specifically tailored for Tier-1 Financial Services institutions. The objective is not direct replacement but strategic overlay—positioning Summit as the critical intelligence governance layer that transforms raw indicators into regulator-ready, defensible intelligence.

## 1. Intelligence Sourcing & Breadth

| Capability | Recorded Future | Summit CompanyOS | Strategic Posture |
| :--- | :--- | :--- | :--- |
| **Global Threat Feed Aggregation** | **High** - Extensive coverage of dark web, OSINT, and technical IOCs. | **Targeted** - Focuses on deep analysis of behavioral risk and market intelligence. | **Overlay** - Leverage RF as the raw data stream; apply Summit to contextualize and govern the intelligence. |
| **Financial Sector Specificity** | Moderate - Broad horizontal coverage. | **High** - Prioritizes FS-ISAC feeds, payment infrastructure abuse, and financial brand impersonation. | **Differentiation** - Summit curates signals specifically impacting operational risk and materiality. |

## 2. Governance, Defensibility & Explainability

| Capability | Recorded Future | Summit CompanyOS | Strategic Posture |
| :--- | :--- | :--- | :--- |
| **Decision Traceability** | Low - "Black box" proprietary risk scores (e.g., Risk 82/100). | **Extreme** - Deterministic report hashes, signed bundles, and replayable intelligence pipelines. | **Proof Moat** - Summit provides the chain-of-custody required by internal audit, the OCC, and the SEC. |
| **Policy Version Control** | Low - Static thresholds. | **High** - Versioned scoring policies aligned to enterprise risk frameworks. | **Differentiation** - Institutional capability to prove exactly *why* a threat was escalated at a specific point in time. |
| **Model Reproducibility** | Low - Opaque SaaS updates. | **High** - Snapshot-centric approach ensuring deterministic evidence (UDR-AC benchmark). | **Differentiation** - Crucial for board-level cyber oversight and litigation discovery defense. |

## 3. Architecture & Deployment (Sovereignty)

| Capability | Recorded Future | Summit CompanyOS | Strategic Posture |
| :--- | :--- | :--- | :--- |
| **Deployment Model** | Pure SaaS - Opaque backend. | **Hybrid / Sovereign** - Offline-first profile, private VPC, on-premise capable. | **Differentiation** - Satisfies strict data locality, vendor risk reviews, and telemetry egress restrictions common in global banks. |
| **Data Residency Guarantees** | Moderate - Regional SaaS hosting. | **High** - Full localization of processing, avoiding cross-border data transfer compliance risks. | **Differentiation** - Unlocks markets and departments restricted from SaaS (e.g., highly regulated trading units). |

## 4. Operationalization & Workflow

| Capability | Recorded Future | Summit CompanyOS | Strategic Posture |
| :--- | :--- | :--- | :--- |
| **Workflow Integration** | High - Splunk, SIEM integrations. | **High** - Deep ServiceNow IR + GRC, Archer (risk management), and Jira integration. | **Parity + Value Add** - Summit integrates not just with the SOC, but deeply into Governance, Risk, and Compliance (GRC) workflows. |
| **Scoring Language** | Technical - High/Medium/Low, CVSS style. | **Business/Risk Native** - "Regulatory Exposure Modifier", "Revenue-impact Asset Mapping". | **Differentiation** - Translates cyber risk into financial materiality for the C-Suite and Board. |

## Summary Execution Strategy

**Do not attack RF head-on.** Inside large banks, frame the narrative as: *"Keep RF as your global feed. Use Summit as the governance layer that makes your intelligence regulator-ready and defensible."* Once Summit is embedded in the GRC workflow and trusted by the board, broader displacement becomes possible.
