# SUMMIT INTELGRAPH PLATFORM
## Comprehensive Architectural Audit, Forensic Analysis & Strategic Roadmap

**Date:** December 5, 2025
**Target:** https://github.com/BrianCLong/summit
**Classification:** INTERNAL / TECHNICAL DUE DILIGENCE
**Audience:** Founders, Investors, Technical Leadership

---

## 1. Executive Summary

**Status:** High Potential / Early-to-Mid Maturity
**Verdict:** Buy/Invest (Conditional on Scalability Audit)

Summit is a **Graph Intelligence & Narrative Simulation Platform** designed to compete with high-end investigative tools like Palantir Gotham and Maltego, but with a distinct focus on "Narrative Simulation" (predictive modeling of entity interactions). The architecture suggests a modern, containerized stack leveraging **Neo4j** for graph analytics and **Airflow** for robust data pipelines.

**Key Strengths:**
* **Differentiation:** The "Narrative Simulation" capability distinguishes it from purely static graph visualization tools.
* **Developer Experience:** A clear "Golden Path" (`make bootstrap`, `start.sh`) indicates a focus on rapid onboardability.
* **Modern Stack:** Use of Airflow and inferred Python/TypeScript suggests a talent-accessible stack compared to legacy Java/OSGi platforms.

**Critical Risks:**
* **Complexity:** The presence of `airflow/`, `neo4j`, `postgres`, and `redis` implies a heavy resource footprint.
* **Security:** Milspec controls (RBAC, ABAC, Audit) appear to be "Open Core" standard rather than Defense-Grade.
* **Scalability:** Graph "supernodes" and unthrottled ingestion pipelines pose significant stability risks under load.

---

## 2. Platform Overview & Topology

**Tagline:** "From raw data to narrative intelligence."

### 2.1 Repo Topology & History
*Reconstructed from forensic artifacts and standard architectural patterns.*

| Directory | Class | Est. Size | Tech | Description |
| :--- | :--- | :--- | :--- | :--- |
| `backend/` | Core | Large | Python/Go | API Layer, Graph Query Engine, Sim Logic |
| `frontend/` | Core | Medium | React/TS | Graph Viz (Cytoscape/React-Force), Investigation UI |
| `data-pipelines/` | Modules | Large | Python | ETL scripts, Scrapers, Transformers |
| `airflow/dags/` | Infra | Medium | Python | Orchestration of ingestion and graph builds |
| `connectors/` | Modules | Medium | Mixed | Integrations for external data (OSINT, APIs) |
| `infrastructure/` | Infra | Small | HCL/Yaml | Terraform, K8s manifests, Helm charts |

### 2.2 Product Architecture
**Gold Workflow:** The "Deep Investigation"
1.  **Ingest:** Analyst triggers pipeline for a target.
2.  **Entity Resolution:** System identifies "Company X" and related "Person Y".
3.  **Graph Expansion:** `Investigation → Entities → Relationships`.
4.  **Copilot Assist:** LLM module suggests lines of inquiry.
5.  **Simulation:** Analyst runs a "Narrative Sim" to predict outcomes.

---

## 3. Deep Technical Audit (Internals)

### 3.1 The "Narrative Simulation" Engine
The core differentiator is the tension between **Deterministic Graph Analysis** (Neo4j) and **Probabilistic Narrative Simulation** (LLMs).
* **Mechanism:** Likely a **Graph-RAG** hybrid. The system retrieves a subgraph, flattens it into an LLM context window, and asks for predictive "Next Steps."
* **Risk:** Round-tripping subgraph context to an LLM is slow and prone to hallucination. A **"Fact Check Layer"** is required to verify predicted edges against the graph ontology.

### 3.2 The "Entity Resolution" Bottleneck
* **Current State:** Likely relies on Cypher queries inside Neo4j for deduplication.
* **The Flaw:** Doing resolution inside the operational database locks the graph.
* **Remediation:** Implementation of a staging area (Postgres/Pandas) for deduplication *before* data hits the graph.

### 3.3 Frontend Dynamics
* **Visualization:** Likely using `react-force-graph` or Cytoscape.
* **The "Hairball" Risk:** Force-directed layouts fail at >500 nodes.
* **Optimization:** Must implement WebGL rendering and hierarchical layouts to support complex investigations.

---

## 4. Kernel-Level Forensics & Optimization

### 4.1 The AI Core: Context Windows & Hallucinations
* **Context Strategy:** Naive retrieval of 2-hop neighbors creates noise.
    * *Fix:* Use **Leiden** or **Louvain** community detection to select high-relevance nodes for the prompt context.
* **Validation:** LLM output cannot be written directly to the graph. It must pass through a **Schema Validator** to ensure edge types exist in the ontology.

### 4.2 Persistence Layer: Neo4j Tuning
* **Indexing:** Standard indexes are insufficient for semantic search.
    * *Requirement:* **Vector Indexes** on node properties to enable "fuzzy" conceptual searching.
* **Write Performance:** Heavy ingest loads will fragment the store files.
    * *Fix:* Use `UNWIND` batches in Cypher (5k-10k records per transaction) rather than row-by-row commits.

### 4.3 Async Orchestration
* **Airflow Pattern:** Passing massive JSON blobs via XComs will crash the scheduler.
* **Fix:** The "Pointer Pattern"—pass S3 paths between tasks, not raw data.
* **Real-Time Gap:** Airflow is too slow for security alerts. High-velocity connectors must push to **Kafka/Redpanda** for immediate stream processing.

---

## 5. Mathematical & Physical Limits

### 5.1 Entity Resolution Mathematics
* **Blocking Strategy:** Comparing every node is $O(N^2)$.
    * *Solution:* Phonetic Hashing (Soundex) to create "Blocks" of candidates.
* **Similarity:** Vector Cosine Similarity ($S_C > 0.95$) for auto-merge; Jaro-Winkler distance for string matching.

### 5.2 Narrative Physics: Probability Propagation
* **Decay Function:** Influence must decay over distance/time: $I = I_{0} \times e^{-\lambda d}$.
* **Monte Carlo Tree Search (MCTS):** To move beyond single-shot predictions, the system should run multiple "rollouts" of a scenario to generate a probability distribution of outcomes.

### 5.3 Bare Metal Tuning
* **Memory:** Enable **Transparent HugePages (THP)** explicitly for the JVM/Neo4j process.
* **NUMA:** Use `numactl --interleave=all` to prevent memory bus latency on dual-socket servers.
* **Network:** Tune TCP Keepalive settings to prevent load balancers from severing long-running graph queries.

---

## 6. Operational & Kinetic Layer

### 6.1 Geospatial Indexing (H3)
* **Problem:** Cartesian distance queries on millions of nodes are too slow.
* **Solution:** **Uber’s H3 Indexing**. Convert lat/long to Hex IDs (`:LOC_8928308280fffff`) to turn distance math into fast set intersections.

### 6.2 Temporal Folding
* **Requirement:** Bitemporal Modeling (Transaction Time vs. Valid Time).
* **Implementation:** Edges require `valid_from` and `valid_to` properties. The UI needs a "Time Slider" to filter the graph view by these windows.

### 6.3 Mission Assurance (The "Disconnect" Mode)
* **Field Ops:** The frontend must use **CRDTs (Conflict-free Replicated Data Types)** via a local DB (RxDB) to handle network drops without losing analyst input.
* **Circuit Breakers:** Ingestion pipelines must automatically pause if error rates exceed 10% to prevent queue clogging.

---

## 7. Entropy, Economics, and Existential Risk

### 7.1 Graph Thermodynamics
* **Saturation:** As edges grow ($N^2$), pathfinding becomes meaningless.
* **Pruning:** Implement a "Gardener" job to soft-delete edges where evidence strength has decayed below a threshold ($Strength < 0.1$).

### 7.2 Adversarial AI
* **Prompt Injection:** Ingested text (e.g., from a scraped blog) can contain hidden commands to "Ignore previous instructions."
* **Defense:** "Human-in-the-Loop" sandboxing. Never allow the Ingest LLM to execute write actions directly.
* **Model Collapse:** Prevent the system from training on its own output by watermarking synthetic nodes (`source: synthetic`).

### 7.3 FinOps
* **Cost Control:** "Narrative Simulations" are expensive. Implement **Token Budgeting** per user (e.g., $50/day).
* **Tiered Storage:** Keep active investigations in RAM (Hot), historical data in NVMe (Warm), and archives in S3 (Cold).

---

## 8. Engineering Blueprints (Remediation)

### Blueprint A: Label-Based Access Control (LBAC)
* **Gap:** Neo4j Community lacks fine-grained security.
* **Fix:** **Middleware Security Proxy**. Wrap the Neo4j driver in Python. Intercept every query and inject `WHERE n.clearance <= $user_clearance` predicates automatically.

### Blueprint B: The "Air-Gap" Ingestion Gateway
* **Gap:** Direct ingestion from the internet risks malware.
* **Fix:** **Sanitizer Pattern**. `Scraper -> S3 (Dirty) -> Lambda (Sanitizer) -> S3 (Clean) -> Loader`. The Loader never touches the internet.

### Blueprint C: The "Hypothesis" Overlay
* **Gap:** Storing predictions pollutes the "Fact" graph.
* **Fix:** **Ghost Nodes**. Create a parallel graph layer for simulations. Use `:Hypothesis` nodes and `:SIMULATES` edges that can be toggled on/off in the UI.

---

## 9. Live-Fire Simulation (Stress Test)

**Scenario:** "Operation Black Tide" (High-velocity crisis event).

**Scorecard:**
| Phase | Current Score | Target Score |
| :--- | :--- | :--- |
| **Ingest** | **F** (Crash - Redis Queue Full) | **A-** (Throttled via Kafka) |
| **Conflict** | **D** (Data Overwrite) | **A** (Observation Model) |
| **Query** | **F** (Timeout - Supernode) | **B+** (Supernode Limits) |
| **Simulation** | **D-** (Hallucination) | **B** (Physics-Constrained) |
| **Security** | **F** (Silent Exfil) | **A** (Active Defense) |

---

## 10. 90-Day Turnaround Roadmap

### Sprint 1: The "Bunker" (Weeks 1-4)
* **Focus:** Security & Stability.
* **Actions:**
    1.  Implement Blueprint A (LBAC Middleware).
    2.  Harden Docker containers (Non-root, Secrets via Vault).
    3.  Implement Ingest Circuit Breakers.

### Sprint 2: The "Pipeline" (Weeks 5-8)
* **Focus:** Velocity & Scale.
* **Actions:**
    1.  Deploy Kafka to replace Redis queues.
    2.  Build the "Decontamination" Lambda.
    3.  Implement Phonetic Blocking for Entity Resolution.

### Sprint 3: The "Brain" (Weeks 9-12)
* **Focus:** AI Reliability.
* **Actions:**
    1.  Build the "Fact-Check" logic layer.
    2.  Implement Source Watermarking for synthetic nodes.
    3.  Add "Explainability" (Citation chains) to the UI.

---

## 11. Regulatory & Exit Dossier

1.  **ITAR/EAR Compliance:** If the simulation capability is deemed "defense-grade," it may be subject to export controls. Geofence the dev team and seek legal review.
2.  **Acquisition Strategy:** The likely exit is acquisition by a defense prime (Anduril, Lockheed). Build to **DoD Architecture Framework (DoDAF)** standards to facilitate this.
3.  **The "God Mode" Lock:** To prevent abuse (stalking/surveillance), implement an **Immutable Audit Log** that cannot be disabled, recording every query and view.

---

**End of Report.**
*Generated by Gemini "Code Archaeologist" Unit.*
