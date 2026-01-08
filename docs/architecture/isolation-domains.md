# Summit Isolation Domains & Trust Boundaries

## 1. Executive Summary

This document defines the **canonical isolation domains** for the Summit platform. It serves as the source of truth for all access control decisions, network segmentation, and data handling policies.

Summit operates as a **mixed-trust environment**. We host mutually distrusting tenants, execute potentially erratic third-party agents, and manage data ranging from public OSINT to classified intelligence.

**Core Principle:** Isolation is _default-deny_. Interaction between domains requires an explicit, auditable bridge.

## 2. Domain Classifications

We define five primary isolation domains, ranked by trust level.

### D1: The Tenant Domain (Hard Boundary)

- **Definition:** A logical enclosure for a single customer organization.
- **Trust Level:** **Zero Trust** (Assume compromised/hostile).
- **Enforcement:** Cryptographic (Keys), Logical (RLS), and Topological (Graph Labels).
- **Data:** Proprietary intelligence, PII, user profiles.
- **Breach Impact:** Critical (Data leak), but strictly scoped to _that_ tenant.

### D2: The Compartment Domain (Soft Boundary)

- **Definition:** A sub-enclosure within a Tenant for specific cases, investigations, or teams (e.g., "Operation Aurora" vs. "HR Data").
- **Trust Level:** **Medium** (Authenticated internal users).
- **Enforcement:** Application-level ABAC (OPA), Graph ACLs.
- **Data:** Case-specific evidence, derived insights.
- **Breach Impact:** Lateral movement within the tenant.

### D3: The Agent Domain (Sandboxed Runtime)

- **Definition:** The execution environment for AI agents (Codex, Jules, external plugins).
- **Trust Level:** **Low** (Code is trusted, behavior is non-deterministic).
- **Enforcement:** Ephemeral containers/VMs, Network policies (Egress filtering), Time/Resource quotas.
- **Data:** Transient context, function tool outputs.
- **Breach Impact:** Resource exhaustion, hallucinated actions, potential data exfiltration if egress isn't clamped.

### D4: The Platform Control Plane (High Trust)

- **Definition:** The core Summit services (Maestro, Auth, Billing, Routing).
- **Trust Level:** **High** (System Operators).
- **Enforcement:** mTLS, IAM Roles, VPN/Bastion access only.
- **Data:** Metadata, billing info, encrypted keys (at rest), system telemetry.
- **Breach Impact:** Catastrophic (Platform compromise).

### D5: The Data Commons (Public/Shared)

- **Definition:** Shared read-only datasets (OSINT feeds, Maps, Ontologies).
- **Trust Level:** **Public/Shared**.
- **Enforcement:** Read-only APIs.
- **Data:** Open source intelligence, standard schemas.
- **Breach Impact:** Pollution/Poisoning of shared data.

---

## 3. Isolation Matrix

This matrix defines allowed interactions initiated by the **Source**.

| Source \ Target   | Tenant (Own)       | Tenant (Other)     | Compartment (Own)         | Agent (Own)      | Control Plane              | Data Commons |
| :---------------- | :----------------- | :----------------- | :------------------------ | :--------------- | :------------------------- | :----------- |
| **Tenant User**   | **Full**           | ⛔ **BLOCK**       | 🟢 **Conditional** (ABAC) | 🟢 **Trigger**   | 🟡 **Read** (Billing/Logs) | 🟢 **Read**  |
| **Agent**         | 🟢 **Scoped**      | ⛔ **BLOCK**       | 🟢 **Scoped**             | 🟢 **Cooperate** | ⛔ **BLOCK**               | 🟢 **Read**  |
| **Control Plane** | 🟡 **Maintenance** | 🟡 **Maintenance** | 🟡 **Audit**              | 🟢 **Manage**    | **Internal**               | **Manage**   |
| **External API**  | 🟢 **Ingest**      | ⛔ **BLOCK**       | 🟢 **Ingest**             | ⛔ **BLOCK**     | ⛔ **BLOCK**               | ⛔ **BLOCK** |

**Legend:**

- **Full**: Read/Write/Delete.
- **Scoped**: Defined by Agent manifest (e.g., "Read-Only", "Append-Only").
- **Conditional**: Requires specific Attribute-Based Access Control (ABAC) policy match.
- **Maintenance**: Automated system tasks (backups, migration) or "Break Glass" operator access (audited).
- **BLOCK**: Hard architectural impossibility. Fail closed.

---

## 4. Data Classification Overlay

Isolation rules are further tightened by Data Classification:

1.  **Restricted (Red):** PII, Credentials, Keys.
    - _Constraint:_ Never leaves D1 (Tenant). Never enters D3 (Agent) memory without redaction.
2.  **Confidential (Amber):** Business Logic, Knowledge Graph.
    - _Constraint:_ Accessible by D3 (Agent) only if ephemeral.
3.  **Internal (Green):** IDs, Metadata, Timestamps.
    - _Constraint:_ Visible to Control Plane for observability.
4.  **Public (White):** Documentation, Schemas.
    - _Constraint:_ Freely cacheable.

## 5. Visual Boundary Diagram (ASCII)

```ascii
+-------------------------------------------------------------+
|  PLATFORM CONTROL PLANE (D4)                                |
|  [Auth] [Billing] [Maestro Orchestrator] [Routing]          |
+---------------+------------------------------+--------------+
                |  mTLS / JWT                  |
+---------------v------------------------------v--------------+
| TENANT A (D1)                                               |
|                                                             |
|  +-------------------+      +----------------------------+  |
|  | Compartment X (D2)|      | AGENT RUNTIME (D3)         |  |
|  | [Case Data]       |<---->| [Codex] [Jules]            |  |
|  | [Evidence]        |      | (Ephemeral / Sandboxed)    |  |
|  +-------------------+      +-------------+--------------+  |
|                                           |                 |
|  +-------------------+                    | (Read Only)     |
|  | Compartment Y (D2)|                    v                 |
|  +-------------------+      +----------------------------+  |
|                             | DATA COMMONS (D5)          |  |
|                             | [OSINT] [Ontologies]       |  |
|                             +----------------------------+  |
+-------------------------------------------------------------+
```
