# State of the Art Subsumption

> **Status:** ACTIVE
> **Owner:** Jules (Chief Architect)
> **Last Updated:** 2025-05-15

## Abstract

This document articulates how Summit does not merely "compete" with existing DevOps, Compliance, and Agent orchestration tools, but **subsumes** them by implementing their features as low-level primitives within a higher-order system.

We do not build "better gates"; we build **systems of record** that make gates redundant. We do not build "better agents"; we build an **orchestration lattice** that makes scripts obsolete.

## The Subsumption Matrix

| Competitor Pattern | Summit Primitive | Why It Cannot Be Copied Cheaply |
| :--- | :--- | :--- |
| **CI/CD Gates**<br>Checklists, approvals, manual sign-offs. | **Provenance Chain (Merkle Roots)**<br>`ProvenanceLedgerV2` with cryptographic chaining (`previousHash`, `currentHash`) and `MutationWitness`. | Requires a fundamental re-architecture of the data model. Logs cannot be retroactively chained without breaking their integrity. |
| **RBAC / IAM**<br>Static roles (Admin, Dev) and permissions. | **Policy-as-Code Engine**<br>`PolicyEngine` with real-time `RiskScoring`, `Autonomy` levels, and `Budget` constraints. | Context-aware policy (e.g., "Allow high autonomy only if budget < $50") requires deep integration into the runtime, not just an auth middleware. |
| **Scripted Agents**<br>Python scripts, "loops", brittle tool calling. | **Autonomous Orchestrator Lattice**<br>`EnhancedAutonomousOrchestrator` with `Task` idempotency, `SafetyCategory` enforcement, and kill-switches. | True autonomy requires state management, deadlock detection, and policy-in-the-loop, which scripting frameworks lack. |
| **Audit Logs**<br>JSON dumps, searchable indexes. | **Evidence Lineage**<br>Immutable, signed `ProvenanceEntryV2` streams anchored to `LedgerRoots`. | Audit logs are typically side-effects. Summit makes them the **primary source of truth** for system state. |

## Deep Dive: Systems-Level Guarantees

### 1. Cryptographic Provenance vs. Logging

Most platforms treat audit logs as "exhaust"—something emitted after the fact. Summit treats provenance as the **commit mechanism**.

* **Competitor Approach:** `logger.info("User X did Y")`
* **Summit Primitive:** `provenanceLedger.appendEntry(...)` which:
    1. Calculates `SHA256(payload + previousHash)`.
    2. Verifies the `MutationWitness`.
    3. Signs the entry with the `CryptoPipeline`.
    4. Anchors it to a `MerkleRoot` for daily signing.

**Reference:** `server/src/provenance/ledger.ts`

### 2. Contextual Policy vs. Static Permissions

Competitors stop at "Who are you?". Summit asks "What are you doing, where, and how risky is it?".

* **Competitor Approach:** `if (user.role == 'admin') allow()`
* **Summit Primitive:** `policyEngine.evaluate(...)` which considers:
  * **Autonomy Level:** Is this a human or an agent? (0-5 scale)
  * **Risk Score:** Calculated from `sensitivity`, `environment`, and `budget`.
  * **Context:** Business hours, production freeze windows, etc.

**Reference:** `server/src/autonomous/policy-engine.ts`

### 3. Orchestration vs. Scripting

Agents in other systems are often just scripts that call LLMs. Summit agents are nodes in a managed lattice.

* **Competitor Approach:** `while(true) { llm.call() }`
* **Summit Primitive:** `EnhancedAutonomousOrchestrator` which:
  * Enforces **Idempotency** (`idempotencyKey`) to prevent double-execution.
  * Manages **Dependencies** (`Task` DAGs).
  * Enforces **Safety Categories** (`read` vs `deploy`).
  * Provides a **Kill Switch** (`redis` backed) for immediate containment.

**Reference:** `server/src/autonomous/orchestrator.enhanced.ts`
