# Summit Graph Intelligence: Competitive Harvest & Positioning (Turn #4)

**Date:** 2026-01-25
**Source:** Automation Turn #4 (Daily Competitive Intelligence Update)
**Scope:** Summit Platform vs. TigerGraph, AWS Neptune, Neo4j
**Status:** **AUTHORITATIVE**

---

## Phase 0: Canonical Framing

**The Premise:**

> **Summit is NOT a general-purpose graph database.**
> **Summit is a governance-first, AI-native, evidence-producing graph intelligence system.**

We do not compete on "queries per second" (QPS) or "raw ingest speed" against TigerGraph or Neptune. We compete on **Trust, Replayability, and Auditability**.

**The Axis:**

* **Competitors (TigerGraph, Neptune, Neo4j):** Optimize for *Query Performance* and *Flexibility*.
* **Summit:** Optimizes for *Governance*, *Provenance*, and *Evidence Integrity*.

---

## Phase 1: Architecture & Capability Extraction

### 1.1 TigerGraph (Savanna) → Summit Implications

TigerGraph's move to "Savanna" (Compute/Storage separation, Hybrid Vector) highlights the industry trend toward AI-centric workloads.

| TigerGraph Capability | Summit Status | Strategic Implication |
| :--- | :--- | :--- |
| **Compute/Storage Separation** | **Partial** | Summit achieves this logically: **Storage = Ledger (Postgres)**, **Compute = Graph (Neo4j)**. We must emphasize that our "separation" enables *Time-Travel* (Replay), not just scaling. |
| **Hybrid Vector + Graph** | **Gap (P1)** | `CanonicalGraphService` is currently a pure Property Graph. We lack a native "Vector Index" inside the canonical graph service. |
| **GQL Standard Support** | **Gap (P2)** | Summit uses Cypher. Lack of GQL is a friction point for future enterprise integration but not a blocker today. |

**Recommendation:**

* **Do Not Build:** A custom graph engine to rival Savanna's speed.
* **Build:** A "Semantic Bridge" that links external Vector Store results back to `CanonicalNode` IDs in the Graph, treating Vector Search as an **Input** to the Provenance Graph.

### 1.2 AWS Neptune → Operational & Deployment Signals

AWS Neptune is winning on "Managed Scale" and "Regional Availability".

| Neptune Capability | Summit Parity | Deployment Strategy |
| :--- | :--- | :--- |
| **Managed Service** | **Superior (SaaS)** | Summit is delivered as a managed "Governance OS". Customers don't manage the graph; they manage the *Policy*. |
| **Regional Availability** | **Native** | Summit's architecture (Postgres + Neo4j) is cloud-agnostic but deployable in any AWS region. |
| **Cost Optimization (Graviton)** | **Irrelevant** | Summit's value metric is "Protected Decisions", not "Compute Hours". We absorb underlying infra costs or pass them through. |

**Guidance:**

* **Positioning:** Summit is the **Intelligence Layer** that *could* run on top of Neptune (future state), but currently provides the *Governance* that Neptune lacks (e.g., "Why did this node change?").

---

## Phase 2: Differentiation & Moat Construction

### 2.1 Neo4j Baseline Neutralization

Neo4j is the market leader but fails key "Systemic Risk" requirements.

**The "Neo4j Neutralization" Brief:**

* **The Flaw:** Neo4j is **Mutable by Default**. A `MATCH ... SET` query destroys history. You cannot prove *what* the graph looked like 5 minutes ago without expensive snapshots.
* **The Summit Fix:** Summit uses a **Ledger-First Architecture**.
  * **Source of Truth:** Immutable `ProvenanceLedger` (Postgres).
  * **Graph:** A *projection* (`CanonicalGraphService.projectEntry`).
  * **Advantage:** We can **Rebuild** the graph from zero to any point in time. Neo4j cannot do this natively.

### 2.2 Hybrid Intelligence Narrative

**TigerVector** proves the market wants "Semantic + Structural" search.

**Summit's Hybrid Model:**

1. **Structure (The Graph):** Defines *Lineage* and *Causality* (Who, What, When).
2. **Semantics (The Vector):** Defines *Meaning* and *Similarity* (Context, Intent).
3. **Governance (The Link):** Summit guarantees that every Vector Result is traced back to a specific, immutable Graph Node.
   * *Competitors:* Return "similar chunks".
   * *Summit:* Returns "provenance-backed evidence chains" that *include* similar chunks.

---

## Phase 3: Governance & Evidence Superiority

### 3.1 Competitive Governance Scorecard

| Feature | **Summit** | Neo4j | TigerGraph | AWS Neptune |
| :--- | :--- | :--- | :--- | :--- |
| **Immutability** | **Native (Ledger)** | Optional (Logs) | No | No |
| **Replayability** | **100% Deterministic** | Snapshot-only | No | Backup-only |
| **Drift Detection** | **Native (Policy)** | Manual | Manual | Manual |
| **Evidence ID** | **Global/Causal** | Database-local | Database-local | Database-local |
| **SLSA Compliance** | **Level 3 (Built-in)** | N/A | N/A | N/A |

### 3.2 Interoperability Posture

* **System of Record:** Summit is the **SoR for Governance**, not raw data.
* **Federation:** We should ingest *provenance metadata* from other graphs (like Linkurious or internal enterprise graphs), but we do not replace them.
* **Zero-ETL:** We reject "Zero-ETL" for Governance. **Governance requires ETL** (Extraction, Transformation, *Loading into Ledger*) to guarantee integrity. "Zero-ETL" = "Zero-Auditability".

---

## Phase 4: Messaging & Positioning

### 4.1 Executive Positioning

1. **"Stop Buying Databases, Start Buying Answers."** TigerGraph/Neo4j give you a place to put data. Summit gives you a **System of Evidence** that explains your data.
2. **"The Immutable Graph."** Unlike standard graph DBs where history is lost on update, Summit's Ledger-First design ensures you can mathematically prove the state of your intelligence at any past millisecond.
3. **"Compliance as Code."** Don't bolt governance onto Neptune. Summit builds the graph *from* the governance events, ensuring every node exists because a policy allowed it.

### 4.2 Where Graph Databases Fail Regulated AI

* **Mutability:** They allow unrecorded changes (INSERT/UPDATE/DELETE).
* **Hallucination Amplification:** Without strict lineage, a graph DB just connects more hallucinations faster.
* **Audit Gaps:** They log "queries", not "decisions". Summit logs the **Decision Context**.

---

## Phase 5: Action Backlog (P0/P1/P2)

| Priority | Capability | Owner | Action Item |
| :--- | :--- | :--- | :--- |
| **P0** | **Vector-Graph Linkage** | `@intelgraph` | Update `CanonicalGraphService` schema to explicitly support "Semantic Evidence" nodes that link to Vector IDs. |
| **P1** | **GQL Facade** | `@platform` | Investigate a thin GQL-to-Cypher translation layer to unblock "Enterprise Standard" RFPs. |
| **P1** | **Replay Drill** | `@governance` | Create a `scripts/drills/graph_replay_verification.ts` to prove the "Neo4j Neutralization" claim (wipe graph -> rebuild from ledger -> verify hash). |
| **P2** | **Neptune Adapter** | `@infra` | Prototype a `Neo4jDriver` alternative that speaks to Neptune (Gremlin/OpenCypher) to prove cloud neutrality. |

---

*Generated via Automation Turn #4 Directive.*
