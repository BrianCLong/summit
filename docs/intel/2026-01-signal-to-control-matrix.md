# Summit Control Mapping: 2026-01 Threat Signals

| Signal ID | Threat / Signal | Summit Control (Current) | Status | Gap / Opportunity |
| :--- | :--- | :--- | :--- | :--- |
| **SIG-2026-001** | **Polyglot Ransomware (Model Weights)** | `ModelRegistry` (Basic checksums) | ⚠️ WEAK | **Gap:** No cryptographic signing of model weights at rest. <br> **Opp:** Integrate `prov-ledger` for model signing. |
| **SIG-2026-002** | **Agentic Identity Permutation** | `IdentityGraph` (Static RBAC) | ⚠️ WEAK | **Gap:** No behavioral analysis of rapid role assumptions. <br> **Opp:** Real-time Identity Graph traversal for anomaly detection. |
| **SIG-2026-003** | **Poisoned RAG Context Injection** | `Conductor` (Semantic Validator) | ❌ CRITICAL | **Gap:** Semantic Validator returns `0.0` (Stub). <br> **Opp:** Implement embedding-based drift detection (Project 19). |
| **SIG-2026-004** | **Behavioral Lineage Obfuscation** | `ProvenanceLedger` (Trace) | ⚠️ PARTIAL | **Gap:** Ledger captures *what* happened, but not *intent* deviation. <br> **Opp:** Behavioral heuristics engine in `Maestro`. |
| **SIG-2026-005** | **EU AI Act Article X Compliance** | `ProvenanceLedger` (Immutable Log) | ✅ STRONG | **Covered.** The Ledger provides cryptographic proof of decision chains. |
| **SIG-2026-006** | **Role Escalation via Context Manipulation** | `PolicyEngine` (OPA Gates) | ⚠️ PARTIAL | **Gap:** OPA checks request parameters but not context window content. <br> **Opp:** Token-aware policy inspection. |

## Gap Analysis & Action Plan

### 1. Semantic Validation Gap (SIG-2026-003)

* **Risk:** High. Agents are vulnerable to context poisoning.
* **Fix:** Prioritize `Conductor` Semantic Validator implementation (Epic: `feat/governance`).

### 2. Model Integrity Gap (SIG-2026-001)

* **Risk:** Medium. Model weight tampering is undetectable.
* **Fix:** Extend `prov-ledger` to sign model artifacts on ingestion.

### 3. Context-Aware Policy Gap (SIG-2026-006)

* **Risk:** High. Prompt injection can bypass rigid OPA rules.
* **Fix:** Add "Context Inspector" middleware before OPA evaluation.
