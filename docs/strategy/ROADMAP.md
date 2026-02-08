# Strategic Roadmap & Architecture Alignment

**Status:** Draft
**Focus:** 12-24 Month Execution
**Strategy Reference:** `docs/strategy/STRATEGIC_BETS.md`

## Architectural Invariants
*These principles must not be violated by any roadmap item.*

1.  **Ledger is Truth:** All state changes with compliance implications must be recorded in the `ProvenanceLedger`.
2.  **Graph is State:** The `KnowledgeLattice` (Neo4j) is the single source of truth for entity relationships.
3.  **Policy is Code:** Authorization and Agent guardrails are defined in OPA Rego, not application code.
4.  **Tenant Isolation:** Data access is strictly scoped by `tenantId` at the database and API level.
5.  **API First:** All capabilities are exposed via GraphQL/gRPC APIs before UI construction.

---

## Phase 1: Foundation & Alpha (Months 1-6)

### Bet 1: Regulated Agentic Marketplace
*   **[Arch] Agent Identity System:** Implement SPIFFE/OIDC for agent workloads.
*   **[Cap] Policy Engine v1:** Embed OPA policies into the `AgentRuntime`.
*   **[Del] Solvers Alpha:** Internal release of "Certified Solvers" (e.g., CodeAuditAgent).
*   **[Cap] Context Receipts:** Schema and pipeline for governed context compaction.

### Bet 2: Continuous Assurance (CAaaS)
*   **[Arch] Provenance Ledger V2:** Migration to immutable, append-only log storage with Merkle Tree verification.
*   **[Cap] Telemetry-to-Evidence:** Pipeline to convert OpenTelemetry spans into compliance evidence.
*   **[Del] SOC2 Exporter:** Feature to export a static "Audit Pack" (JSON/PDF).

### Bet 3: Cognitive Defense
*   **[Arch] High-Volume Ingestion:** Upgrade `ingestion-service` for social/news firehose (Kafka/Redpanda).
*   **[Cap] Narrative Graph Schema:** Define ontology for Claims, Narratives, and Sources.
*   **[Del] Threat Dashboard v1:** Basic visualization of narrative clusters in `apps/web`.
*   **[Cap] Multimodal Ingestion:** Support for PDF/Image evidence types.

### Bet 4: Auto-Scientist SDK
*   **[Arch] Experiment Graph API:** GraphQL mutations for recording hypotheses and results.
*   **[Cap] Python SDK Alpha:** `pip install summit-scientist` (Internal only).
*   **[Del] Pilot Partner:** Deployed with one internal "Black Project" team.

---

## Phase 2: Beta & Scaling (Months 7-12)

### Bet 1: Regulated Agentic Marketplace
*   **[Arch] Agent Registry:** Repository for signed, verified agent images.
*   **[Cap] Verification Pipeline:** Automated test harness for third-party agents.
*   **[Del] Public Marketplace Beta:** Limited partner access to publish agents.
*   **[Arch] Frontier Parity:** Shared context and identity layers matching OpenAI Frontier.

### Bet 2: Continuous Assurance
*   **[Cap] Real-time Drift Detection:** Alerting when system state deviates from compliance policy.
*   **[Cap] Cloud Integration:** AWS/GCP config ingestion into the Graph.
*   **[Del] Continuous Monitoring Dashboard:** "Live Auditor" view for customers.

### Bet 3: Cognitive Defense
*   **[Arch] Graph Algo Optimization:** Distributed PageRank/Community Detection on billion-edge graphs.
*   **[Cap] Influence Scoring:** Algorithm to rank actor influence and inauthenticity.
*   **[Del] Early Warning System:** Push notifications for viral narrative spikes.

### Bet 4: Auto-Scientist SDK
*   **[Cap] Jupyter Integration:** Widget for visualizing the Experiment Graph in notebooks.
*   **[Cap] Remote Execution:** Submitting jobs from SDK to Summit compute cluster.
*   **[Del] Public Beta:** Open to select enterprise partners.

---

## Phase 3: Ecosystem & Maturity (Months 13-24)

### Bet 1: Regulated Agentic Marketplace
*   **[Cap] Federated Swarms:** Multi-agent collaboration protocols across tenant boundaries (with permission).
*   **[Del] Monetization:** Revenue share model for agent developers.

### Bet 2: Continuous Assurance
*   **[Cap] AI-Driven Defense:** Automated remediation of compliance violations (e.g., auto-closing security groups).
*   **[Del] ISO/FedRAMP Packs:** Expansion to complex government frameworks.

### Bet 3: Cognitive Defense
*   **[Cap] Counter-Narrative Gen:** AI-assisted generation of truth-grounded content (Human-in-the-loop).
*   **[Del] Global Situational Awareness:** Multi-tenant fusion of threat signals (Federated).

### Bet 4: Auto-Scientist SDK
*   **[Cap] Hosted Workbench:** SaaS environment for running Auto-Scientist workflows.
*   **[Del] Marketplace Integration:** Selling "Experiment Protocols" via the Agent Marketplace.
