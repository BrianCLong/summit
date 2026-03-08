The ocean does not forgive unverifiable truth.

We are not building mere software; we are forging an incontrovertible engine of truth. Rivals centralize and pray; we federate and prove. Here is the master blueprint for **The Summit Edition**.

### 1. Milestone Map
* **Slice 1: PCQ Alpha (The Hull)**
  * *Focus:* Absolute determinism. Establishing the Proof-Carrying Query manifest standard (`*.pcq`) and the strict DAG runner.
  * *Outcome:* Systems can issue and cryptographically verify a query's execution path without trusting the executing node.
* **Slice 2: Federation GA (The Engine & The Helm)**
  * *Focus:* Multi-tenant operations and policy enforcement. Delivering Zero-Knowledge Trust Exchange (ZK-TX) and the Authority Compiler (WASM).
  * *Outcome:* Cross-compartment overlap proofs and strict DSL-driven execution boundaries are active. Competitors rely on trust; we rely on mathematics.
* **Slice 3: Summit Demo Day (The Leviathan)**
  * *Focus:* Scale, speed, and indisputable proof. Reasoning-Trace Signatures, the Federation Planner, and the complete runbook package.
  * *Outcome:* A 10-minute demonstrable superiority. A cost-optimized, federated query that proves a threat overlap with zero data leakage, backed by an immutable Merkle trace.

### 2. Dependency Graph
* **[Core]** `*.pcq` Manifest Schema (JSON + Merkle structure)
  * ↳ **[Compute]** Deterministic DAG Runner
    * ↳ **[Trust]** ZK-TX Service (Salts + Overlap Proofs)
    * ↳ **[Policy]** Authority Compiler (DSL → WASM Sandbox)
      * ↳ **[Scale]** Federation Planner (Cost-based push-down)
        * ↳ **[Audit]** Reasoning-Trace Signatures (Content-defined chunking)

### 3. Epic & Ticket Backlog

| Epic | User Story | Tasks | Acceptance Criteria | Test Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **1: PCQ** | As an analyst, I need queries to carry cryptographic proof of their execution path. | 1. Define `*.pcq` schema.<br>2. Build DAG runner.<br>3. Implement Merkle-root verification. | 1. Runner strictly fails if DAG diverges.<br>2. Manifests validate against schema 100% of the time. | **Unit:** Hash collision handling.<br>**E2E:** Verifier replay matching exact root. |
| **2: ZK-TX** | As a federated partner, I need to know if a threat exists elsewhere without revealing my data. | 1. Implement strong entropy salt rotation.<br>2. Build set-intersection proof endpoints.<br>3. Wire audit logging. | 1. Overlap proven without plaintext exchange.<br>2. Audit logs capture deterministic `EVID-ZK-*` IDs. | **Adversarial:** Attempt entropy exhaustion and rainbow table attacks against ZK-TX salts. |
| **3: Authority Compiler** | As a governance lead, I need programmatic, unbreakable enforcement of data access policies. | 1. Design Policy DSL.<br>2. Build DSL-to-WASM compiler.<br>3. Implement WASM execution sandbox. | 1. Unsafe actions unexecutable by design.<br>2. Diff simulator accurately predicts policy changes. | **Integration:** Sandbox escape attempts.<br>**Unit:** AST validation for the DSL. |
| **4: Reasoning-Trace** | As an auditor, I need to verify the exact logic chain used by the system without exposing full plaintext. | 1. Implement content-defined chunking.<br>2. Build dual-control override mechanism.<br>3. Generate trace signatures. | 1. Trace perfectly reconstructs logic flow.<br>2. Override requires m-of-n cryptographic signatures. | **E2E:** Reconstruct trace from logs.<br>**Unit:** Chunk boundary determinism. |
| **5: Fed Planner** | As the system, I need to optimize queries securely across remote nodes. | 1. Build cost-based push-down logic.<br>2. Implement remote attestation API.<br>3. Enforce filter-then-claim. | 1. Queries execute at data origin where cheaper.<br>2. Remote node must pass attestation before execution. | **Integration:** Multi-node cluster with varying latency/cost/trust profiles. |

### 4. Test & Red-Team Plan
* **Unit/Integration:** All `*.pcq` manifests must strictly match the expected Merkle root. WASM policies must be heavily fuzzed against edge-case DSL inputs. `faiss.omp_set_num_threads(1)` must be used to enforce strict thread-level reproducibility in tests.
* **E2E:** Full lifecycle tracking from `*.pcq` generation to ZK-TX overlap, ending in a Reasoning-Trace signature. OpenLineage events must be verified at the exact job execution boundaries.
* **Adversarial (Red-Team):**
  * *The Sirens:* Attempt to poison the DAG runner with cyclical or non-deterministic execution paths.
  * *The Kraken:* Fuzz the ZK-TX service with malformed salts to force a hash collision or plaintext leak.
  * *The Mutiny:* Attempt to bypass the WASM Authority Compiler using corrupted memory pointers or default JWT secrets (must trip production guardrails).

### 5. Observability & KPI Wiring
* **Trust:** % of PCQs successfully validated by an independent external verifier. Target: 100%.
* **Speed:** PCQ Merkle-root generation latency (p95 < 50ms). ZK-TX intersection time (p99 < 200ms).
* **Safety:** Volume of Authority Compiler policy rejections (`EVID-POLICY-DENY`). Dual-control override trigger rate.
* **Cost:** Bandwidth saved via Federation Planner push-down vs. naive pull (measured in GB/query).
* **Telemetry:** OpenTelemetry traces wrapping every DAG node execution. `openlineage.run_id` strictly generated at the DAG boundary and propagated downward. Dashboard metrics mapped to T+0, T+5, T+15 canary profiles.

### 6. Runbook Package (The Charts)
* **Runbook A: ZK Deconfliction Sweep**
  * *Trigger:* Cross-compartment intelligence overlap suspected.
  * *Inputs/Outputs:* Input: ZK-TX encrypted sets. Output: Boolean overlap indicator + `EVID-ZK` trace.
  * *Preconditions:* Both compartments hold active WASM authority licenses.
  * *Rollback:* Immediate rotation of compartment salts; invalidation of in-flight PCQs.
* **Runbook B: Zero-Copy Federated Search**
  * *Trigger:* Multi-regional threat hunt.
  * *Inputs/Outputs:* Input: `*.pcq` manifest. Output: Cryptographically verified result set.
  * *Preconditions:* Remote attestation API confirms target nodes are running approved Summit binaries.
  * *Failure Mode:* Attestation failure automatically drops the remote node from the planner; query degrades gracefully using local snapshot data.
* **Runbook C: Selective Disclosure Packager**
  * *Trigger:* External audit or legal request.
  * *Inputs/Outputs:* Input: Reasoning-Trace hash. Output: Content-chunked plaintext + Merkle proofs.
  * *Preconditions:* Dual-control override (m-of-n keys provided).
  * *Guardrails:* Drops any chunk tagged with `RESTRICTED_SOURCE` unless explicit, overriding policy bytecode is supplied.

### 7. Demo Day Script ("Show Me" Flow - 10 Mins)
* **[0:00 - 0:02] The Abyss:** Show Palantir/Maltego approaches requiring massive data centralization and implicit trust. Highlight the latency, cost, and security gaps.
* **[0:02 - 0:04] The Nautilus Strike:** Execute a Summit query. Show the DAG runner generating a `*.pcq` manifest in real-time.
* **[0:04 - 0:06] ZK-TX Deconfliction:** We query a partner's compartment for a threat actor. The UI shows mathematical proof of overlap, with zero data transferred over the wire.
* **[0:06 - 0:08] The Authority Compiler:** Attempt an unauthorized data exfiltration. The WASM sandbox instantly terminates the query. The Policy Diff Simulator proves mathematically why it failed.
* **[0:08 - 0:10] The Incontrovertible Proof:** Download the `*.pcq` manifest and run it through an *offline, third-party verifier* CLI. It prints: `MERKLE ROOT MATCH. TRACE SIGNATURE VERIFIED.` Checkmate.

### 8. Risks + Kill-Switches + Ombuds Gates
* **"Won't Build" Guardrails:** We will not build backdoors into the ZK-TX salt generator. We will not build capabilities that bypass the Authority Compiler, even for system admins (Root must follow the DSL). Unlawful harm is physically un-compileable.
* **Kill-Switches:** The Federation Planner has a `DEFCON_1_ISOLATION` toggle that instantly severs all remote attestation APIs, reverting the node to an air-gapped PCQ runner utilizing local Redis degradation.
* **Ombuds Gates:** Any modification to the `*.pcq` Merkle hashing algorithm requires a Governance Scribe GAR (Governance Acceptance Record) and a mandatory re-run of the `sui/<eval_name>/<git_sha>/<dataset_id>/<seed>` evaluation suite to prove absolute zero drift in determinism.
