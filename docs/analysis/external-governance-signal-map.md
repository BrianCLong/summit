# External Governance Signal Map

**Date:** 2025-01-23
**Status:** Internal Analysis
**Scope:** Microsoft Purview (Azure AI Foundry), Palantir Foundry, Dataiku vs. Summit

## 1. Governance Capability Primitives Mapping

| Capability | Microsoft Purview (Azure AI Foundry) | Palantir Foundry (AIP) | Dataiku (LLM Mesh) | Summit (Evidence-First) |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime Observability** | Hub-based monitoring, content safety triggers, PII detection. | AIP Logic lineage, checkpointing, workflow tracing. | LLM Mesh central monitoring, cost tracking per project. | **Evidence-Linked Execution Audit**. Real-time OPA enforcement at tool-call level. |
| **Lineage & Provenance** | Probabilistic data discovery and sensitivity labeling. | Strong ontology-bound lineage, but proprietary/siloed. | Lineage between models and datasets, metadata-driven. | **Granular Claims Ledger**. Every fact traces to Evidence ID, source, and confidence score. |
| **Access Control** | Identity binding via M365/Azure RBAC, sensitivity labels. | Deeply integrated ABAC/RBAC on ontology objects. | Project-level permissions and model gateway controls. | **Unified OPA Policy Engine**. Multi-tenant ABAC with cryptographic isolation. |
| **Audit & Reporting** | Unified AI Hub reports, Purview compliance manager. | AIP Checkpoints, deterministic audit trails for sensitive workflows. | Model governance dashboards, cost reports. | **Deterministic Evidence Bundles**. Immutable, non-timestamped audit artifacts. |
| **Workflow Governance** | Pre-built templates for safety; human-in-the-loop triggers. | AIP Logic "governance-first" design, hand-offs between human/AI. | LLM Mesh safety gates (pre-configured checks). | **Governed-by-Design DAGs**. Maestro-enforced policy checks at every step. |
| **Risk & Remediation** | Risk scores for AI apps; automated content moderation. | Digital Twin simulation for risk impact analysis. | Safety gates for toxicity and PII remediation. | **Evidence-First Risk Classification**. Risk scores derived from verifiable Evidence IDs. |

## 2. Competitive Differentiators & Summit Moat

### Microsoft Purview / Azure AI Foundry
*   **What they do well:** Deep integration with the Microsoft ecosystem (M365, Azure). Seamless PII and toxicity detection for general use cases.
*   **What they do not do:** Deterministic governance for air-gapped or non-Azure environments. Granular "reason-for-access" at the execution layer.
*   **Summit Opportunity:** **Portability & Determinism**. Summit can be deployed in highly regulated "dark sites" (FedRAMP High/IL5) where public cloud governance suites are inaccessible.

### Palantir Foundry (AIP)
*   **What they do well:** World-class ontology modeling and operationalizing AI for complex industrial/government workflows. AIP Logic provides strong lineage.
*   **What they do not do:** Transparent, policy-as-code (OPA) definitions that customers can own and audit independently of the vendor's platform.
*   **Summit Opportunity:** **Governance-as-Code Transparency**. Summit uses open-source OPA and documented policies, whereas Palantir’s governance is often a "black box" proprietary layer.

### Dataiku (LLM Mesh)
*   **What they do well:** Abstracting model complexity and providing a unified cost/safety layer across multiple LLM providers.
*   **What they do not do:** Deep, graph-native provenance that links individual tool calls and reasoning steps back to primary evidence.
*   **Summit Opportunity:** **Graph-Native Provenance**. Summit doesn't just "monitor" model usage; it tracks the *intelligence chain* through a knowledge graph, making it 10x easier to debug hallucinations and bias.

## 3. Summit "Out-Govern" Strategy

| Target | Strategy | Summit Advantage |
| :--- | :--- | :--- |
| **Evidence-ID Linkage** | Link every governance verdict to a specific Evidence ID. | Competitors use heuristic labels; Summit uses verifiable IDs. |
| **Determinism** | Eliminate timestamps from primary governance artifacts. | Competitors rely on logs; Summit relies on deterministic state. |
| **Execution-Layer Audit** | Audit at the tool-call and reasoning-path level. | Competitors audit at the API/request level. |
| **Multi-Tenant Isolation** | Cryptographic and policy-enforced tenant boundaries. | Summit provides "harder" isolation than pure SaaS platforms. |
