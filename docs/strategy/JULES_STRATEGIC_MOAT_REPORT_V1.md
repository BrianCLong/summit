# Jules Strategic Moat Report V1

**Date:** 2025-05-15
**Author:** Jules (Chief Systems Architect)
**Status:** ACTIVE
**Classification:** STRATEGIC INTERNAL

## 1. Capability Extraction Map

This map identifies the core capabilities harvested from Summit's operations, defining their role in the defensive architecture.

| Capability | Problem Class | Type | Location | Enforcement |
| :--- | :--- | :--- | :--- | :--- |
| **Graph-Native Provenance** | Audit Integrity & Lineage | Detective | `server/src/provenance/ledger.ts` | `ProvenanceEntryV2` Schema & Hash Chain |
| **Policy-Embedded Computation** | Autonomous Safety | Preventative | `server/src/autonomous/policy-engine.ts` | OPA/Rego `allow` decision in API |
| **Agent Lattice Governance** | Multi-Agent Coordination | Corrective | `AGENTS.md` | `scripts/ci/` & `agent-contract.json` |
| **Universal Evidence Format (UEF)** | Compliance Standardization | Accelerative | `docs/standards/` | `ProvenanceEntry` Schema |
| **Deterministic Simulation** | Intelligence Reproducibility | Accelerative | `server/src/provenance/` | Ledger Replay / Event Sourcing |
| **Golden Path CI** | Repository Hygiene | Preventative | `Makefile` (`make smoke`) | CI Pipeline Gates |

## 2. Primitive Canonicalization

We define the following canonical primitives to standardize system behavior.

### 2.1. Primitive: `ProvenanceEntry` (The Atom of History)

**Definition:** An immutable, cryptographically chained record of a state change.

* **Inputs:** `tenantId`, `actionType`, `resourceId`, `actorId`, `payload` (Mutation), `witness` (Signature).
* **Outputs:** `currentHash` (SHA-256), `sequenceNumber`.
* **Failure Mode:** Hash mismatch breaks chain; invalid signature rejects entry.
* **Enforcement:** `ProvenanceLedgerV2.appendEntry` (Strict Schema).

### 2.2. Primitive: `PolicyDecision` (The Atom of Control)

**Definition:** A deterministic boolean verdict derived from context, resource sensitivity, and risk score.

* **Inputs:** `Subject` (User/Agent), `Action`, `Resource`, `Context` (Env, Time).
* **Outputs:** `allowed` (bool), `reason` (string), `riskScore` (0-100), `requiresApproval` (bool).
* **Failure Mode:** "Fail Closed" (Deny by default on error/timeout).
* **Enforcement:** `PolicyEngine.evaluate` -> API Middleware Interceptor.

### 2.3. Primitive: `AgentContract` (The Atom of Authorization)

**Definition:** A machine-readable definition of an agent's allowed scope, capabilities, and owner.

* **Inputs:** `AgentID`, `AllowedPaths`, `AllowedTools`, `HumanOwner`.
* **Outputs:** CI Permission Grant / Denial.
* **Failure Mode:** CI blocks PR/Action if contract is violated or missing.
* **Enforcement:** `scripts/ci/check-boundaries.cjs` & `AGENTS.md`.

## 3. Moat Analysis

### 3.1. The Graph-Native Provenance Moat

**Why it is hard to replicate:**
Most competitors treat "audit logs" as a sidecar text file or a separate ELK stack. Summit embeds provenance **directly into the knowledge graph** via the Ledger-Graph projection. This means queries can filter by *trustworthiness* and *lineage* in real-time. To replicate this, a competitor would need to re-architect their entire storage layer to be bitemporal and lineage-aware from day one.

**Second-Order Effect:**
We can offer "Trust-Based Access Control" (TBAC) where users can only see data that meets a certain provenance standard, a feature impossible for bolt-on audit systems.

### 3.2. The Policy-Embedded Computation Moat

**Why it is hard to replicate:**
Standard compliance is a "checkbox" at the end of a process. Summit's `PolicyEngine` injects compliance rules (OPA) into the *execution path* of every autonomous action. The system *cannot* act non-compliantly because the code path requires a valid `PolicyDecision` token.

**Second-Order Effect:**
Regulatory agility. When laws change, we update one Rego policy file, and the entire agent swarm instantly conforms. Competitors must retrain models or rewrite application logic.

## 4. Systemization Plan

We must move from "Tribal Knowledge" to "Enforced Systems".

### 4.1. Formalize the Tool Registry (Critical Gap)

* **Problem:** Tool access logic is currently implicit or scattered. `governance/tool_registry.yaml` is referenced but missing.
* **Action:** Create `governance/tool_registry.yaml` defining allowed tools per agent role.
* **Enforcement:** Update `scripts/ci/registry_audit_gate.mjs` to actually parse this file and fail builds on unauthorized tool usage (currently it just returns `true`).

### 4.2. Harden Ledger Root Signing

* **Problem:** `ProvenanceLedger` relies on an in-memory `setTimeout` loop in the constructor for root signing. This is fragile (resets on restart) and inappropriate for serverless/ephemeral environments.
* **Action:** Move root signing to a dedicated cron-triggered worker or external service (`CronJob` -> `POST /admin/ledger/sign-root`).
* **Artifact:** `provenance_roots` table (already exists) + dedicated Signing Worker.

### 4.3. Automate UEF Validation

* **Problem:** UEF adherence is checked manually or via weak schemas.
* **Action:** Implement `scripts/ci/verify_uef_compliance.ts` that validates all `ProvenanceEntry` payloads against the strict JSON schema.

## 5. Governance Hardening

### 5.1. The "Witness" Gate

**New Rule:** No mutation (write/update/delete) can be committed to the Ledger without a cryptographic `MutationWitness` from a separate service/key.
**Implementation:** `ProvenanceLedger.appendEntry` must throw if `witness` field is missing for `MutationPayload`.

### 5.2. The "Registry" Gate

**New Rule:** No code may import a package or call an external API not explicitly whitelisted in `governance/tool_registry.yaml`.
**Implementation:** A compile-time scanner (ESLint plugin or CI script) that checks all imports against the registry.

## 6. Narrative & Intelligence Moat

### 6.1. Productizing "Deterministic Simulation"

**Insight:** We have a ledger of every state change. We can offer a "Time Machine" feature.
**Claim:** "Summit is the only platform where you can *replay* an intelligence assessment from 6 months ago, bit-for-bit, to prove why a decision was made."
**Defense:** This targets the "Explainability" pain point of AI. Competitors with black-box LLM chains cannot do this.

### 6.2. "Governance as Velocity"

**Insight:** Most view governance as a brake. We view it as an accelerator (Policy Engine auto-approval).
**Claim:** "Summit Agents move 10x faster because they are pre-authorized to act within safe bounds."
**Defense:** We sell *speed through safety*. Competitors sell *speed with risk* or *safety with slowness*.
