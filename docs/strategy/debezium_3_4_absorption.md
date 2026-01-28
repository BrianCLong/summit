# Competitive Absorption: Debezium 3.4 Series

> **Status:** STRATEGY DEFINITION
> **Owner:** Jules (Chief Architect)
> **Date:** 2026-01-28
> **Target:** Debezium 3.4 (Released Jan 2026)

## Executive Summary

Debezium 3.4 represents a commoditization of basic Change Data Capture (CDC) and observability signals. While it advances the state of open-source CDC with multi-engine support and OpenLineage integration, it remains a **passive transport layer**.

Summit absorbs these capabilities not as features, but as **low-level plumbing** for the **Universal Data Provenance** system. We do not compete on "moving data"; we compete on **guaranteeing truth**.

---

## Phase 1: Total Extraction (The Commodity Ledger)

We acknowledge the following capabilities in Debezium 3.4 as the new "floor" for data movement.

| Feature Area | Debezium 3.4 Capability | Inferred Constraint / Assumption |
| :--- | :--- | :--- |
| **Observability** | Native OpenLineage output events. | **Trust-blind:** Emits "what happened" but cannot prove "who authorized it" or "why it is safe". Lineage is descriptive, not prescriptive. |
| **Runtime** | Multi-engine support (Debezium Server). | **Fragmented Control:** Depends on external runtime orchestration. No unified policy plane across engines. |
| **Connectivity** | PostgreSQL 18 compatibility. | **Version Chasing:** Reactive to upstream vendor cycles. No semantic abstraction over DB versions. |
| **Identity** | AWS IAM for PostgreSQL. | **Platform Lock-in:** Auth is tied to infrastructure provider, not the Data Graph identity. |
| **Output** | Various sink connectors (Kafka, etc.). | **Schema Drift:** Downstream consumers must handle schema evolution and conflict resolution manually. |

---

## Phase 2: Subsumption (The Summit Primitive)

We replace distinct Debezium "features" with composable Summit primitives.

| Debezium Feature | Summit Subsumption Primitive | Why It Is Superior |
| :--- | :--- | :--- |
| **OpenLineage Events** | **Universal Evidence Format (UEF)** | UEF is **cryptographically anchored** (merkle-chained) and includes **Policy Decision IDs**. OpenLineage is just a log; UEF is a legal receipt. |
| **Multi-Engine Server** | **Agent Lattice Runtime** | We do not configure "servers"; we dispatch **Ingest Agents**. The runtime (K8s, Serverless, Edge) is an implementation detail of the Agent's charter. |
| **Postgres 18 Adapter** | **IntelGraph Polyglot Layer** | We ingest Postgres WALs into the **IntelGraph**, converting rows to **Nodes/Edges**. We query the Graph, not the DB version. |
| **Schema Evolution** | **Behavioral Merge Engine (RAM)** | Schema changes are treated as **Merge Conflicts**. The RAM algorithm resolves them based on policy, not just crashing the pipeline. |

---

## Phase 3: Exceedance (10x The Standard)

We do not just "match" Debezium; we invert the value proposition.

### 1. Lineage: From "Trace" to "Chain of Custody"
*   **Competitor:** "Debezium emitted an event saying Table A changed."
*   **Summit:** "Agent `Orion` authorized a mutation to `Entity:42` rooted in `Jira:Ticket-101`, validated against `Policy:No-PII-v2`, and signed with `Key:Orion-Prod-Alpha`. Here is the Merkle Proof."

### 2. Engines: From "Multi-Engine" to "Universal Replay"
*   **Competitor:** Run on Kafka Connect or Debezium Server.
*   **Summit:** The ingestion logic is a **deterministic state machine**. We can replay the entire history of a database into a different backend (e.g., Neo4j -> Postgres) with bit-perfect fidelity, verified by the **Security Ledger**.

### 3. Database: From "Compatibility" to "Temporal Federation"
*   **Competitor:** Read current state + logs.
*   **Summit:** **Bi-temporal Graph**. We know what the data was at `T1` and when we learned about it at `T2`. We can reconstruct the "World View" of any agent at any point in history.

---

## Phase 4: Moat Construction (The Uncrossable Gap)

### Moat 1: Governance Lock-In (The "Golden Handcuffs")
Once a dataset is ingested via Summit, it acquires a **Provenance Chain**.
*   Downstream ML models **refuse** to train on data without a valid UEF signature.
*   Compliance reports are **auto-generated** from the chain.
*   **Result:** Removing Summit breaks the entire compliance and ML pipeline. Debezium cannot offer this because it is just a pipe.

### Moat 2: Evidence Gravity
The more data flows through Summit, the more valuable the **IntelGraph** becomes.
*   Debezium streams are isolated pipes.
*   Summit streams fuse into a single Knowledge Graph.
*   **Result:** A customer using Debezium has 100 disconnected streams. A customer using Summit has 1 cohesive Intelligence Graph.

---

## Phase 5: Executive Comparison

| Dimension | Debezium 3.4 (Competitor) | Summit / IntelGraph |
| :--- | :--- | :--- |
| **Core Function** | Change Data Capture (CDC) | Universal Data Provenance & Ingestion |
| **Output** | JSON Logs / Avro | Signed Evidence Graphs (UEF) |
| **Governance** | None (External) | In-Stream Policy Enforcement (OPA) |
| **Schema Changes** | Often Breaks / Manual Schema Registry | Automated Behavioral Merging (RAM) |
| **Target Audience** | Data Engineers | Compliance Officers, AI Safety Architects |
| **Verification** | "Trust the Pipe" | "Verify the Signature" |

**Conclusion:** Debezium 3.4 is a valid **component** for low-level byte shuffling. Summit is the **Operating System** that makes that data safe, legal, and usable for AI. We may use Debezium under the hood, but we **never** expose its raw output to the enterprise. All data must be wrapped in UEF.
