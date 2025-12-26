# Outcome-Capability Map

This document maps Customer Jobs-to-Be-Done (JTBD) to platform capabilities, identifying required entitlements and current gaps.

## 1. Defend Against Influence Operations
**Outcome:** Detect and neutralize coordinated inauthentic behavior.

| Capability | Component / Service | Description |
| :--- | :--- | :--- |
| **Network Analysis** | `IntelGraph` (Neo4j) | Graph algorithms (PageRank, Louvain) to detect botnets and coordinated clusters. |
| **Narrative Detection** | `ContentAnalyzer` / `GraphRAG` | NLP to cluster similar content and identify hostile narratives. |
| **Response Orchestration** | `DefensivePsyOpsService` | Automated countermeasures and takedown request generation. |

**Gaps:**
*   **Visualization UX:** The `GraphIntelligencePane` is powerful but can be overwhelming for non-technical analysts (High Friction).
*   **Real-time Ingestion:** Ingestion pipeline latency may delay detection > 15m for high-volume attacks.

## 2. Ensure Regulatory Compliance
**Outcome:** Automated audit readiness and evidence.

| Capability | Component / Service | Description |
| :--- | :--- | :--- |
| **Immutable Logging** | `ProvenanceLedger` | Append-only ledger for all system events and decisions. |
| **Evidence Management** | `WormStorageService` | Secure storage for artifacts (screenshots, logs, raw data). |
| **Verification** | `prov-verify` CLI | Cryptographic verification of exported evidence bundles. |

**Gaps:**
*   **Self-Serve Export:** UI for generating bundles is currently developer-focused (API only); needs a "One-Click Export" button in Admin Panel.
*   **Policy Coverage:** Not all innovative AI flows have pre-built policy templates (e.g., "Human-in-the-Loop" specific policies).

## 3. Orchestrate Reliable Agentic Workflows
**Outcome:** Reliable execution of complex tasks.

| Capability | Component / Service | Description |
| :--- | :--- | :--- |
| **Workflow Engine** | `Maestro` (Conductor) | Directed Acyclic Graph (DAG) execution engine with state management. |
| **Resiliency** | `BullMQ` / `Retry Strategies` | Automatic retries, exponential backoff, and dead-letter queues. |
| **Observability** | `Maestro Run Console` | Real-time visibility into run status, step inputs/outputs, and logs. |

**Gaps:**
*   **Debuggability:** Error messages from LLMs can be opaque; "why did this fail?" often requires checking raw logs.
*   **Cost Controls:** No "circuit breaker" for runaway token spend *within* a single run (only global quotas).

## 4. Accelerate Intelligence Analysis
**Outcome:** Rapid synthesis of data into insight.

| Capability | Component / Service | Description |
| :--- | :--- | :--- |
| **Data Fusion** | `IntelGraph` / `IngestionHooks` | Unifying structured and unstructured data into a single knowledge graph. |
| **Natural Language Query** | `GraphRAGQueryService` | "Chat with your data" capability grounded in the graph. |
| **Visual Exploration** | `Summit` (Map/Graph/Time Panes) | Multi-modal interface for exploring connections. |

**Gaps:**
*   **Citation Granularity:** LLM answers don't always link back to the *specific* graph node evidence clearly in the UI.
*   **Data Freshness:** OSINT connectors run on a schedule, not on-demand, leading to potential staleness.

## 5. Safe & Governed AI Experimentation
**Outcome:** Risk-free innovation.

| Capability | Component / Service | Description |
| :--- | :--- | :--- |
| **Policy Enforcement** | `OPA` (Open Policy Agent) | Real-time policy checks for every prompt and output. |
| **Data Protection** | `PrivacyService` / `PII Hooks` | Redaction and detection of sensitive entities before LLM submission. |
| **Resource Management** | `QuotaManager` | Tenant-level budgets and rate limits. |

**Gaps:**
*   **Sandbox Isolation:** "Sandbox" mode currently shares some infrastructure with Prod; needs stricter logical separation.
*   **Policy Editor:** No UI for non-technical users to define or tweak policies (requires Rego knowledge).
