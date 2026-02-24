# Summit Switchboard (Control Plane) Specification

## 1. Overview
Summit Switchboard is the **governance control plane** for the ecosystem. It is responsible for **authenticating tool servers**, **brokering credentials**, **enforcing policy**, and **issuing provenance receipts**. It does *not* route messages between agents (that is the Agent Switchboard/Data Plane).

## 2. "Which Switchboard?" Disambiguation Matrix

| Feature | Summit Switchboard (Control Plane) | Agent Switchboard (Data Plane) |
| :--- | :--- | :--- |
| **Primary Responsibility** | Governance, Identity, Policy, Receipts | Message Routing, Pub/Sub, State Sync |
| **Traffic Type** | Low-frequency (Setup/Teardown/Check) | High-frequency (Chat/RPC/Stream) |
| **Credential Handling** | **Source of Truth** (Mints scoped tokens) | **Consumer** (Uses tokens to route) |
| **Failure Mode** | **Fail Closed** (Deny access) | **Fail Open/Degrade** (Drop message/Retry) |
| **Persistence** | Durable (Ledger, Policy Graph) | Ephemeral (Queues, Topics) |
| **Key Artifact** | `provenance_receipt.json` | `trace_id` |
| **Analog** | Kubernetes Control Plane (API Server) | Envoy / Service Mesh Sidecar |

## 3. Core Architecture

### 3.1 Deny-by-Default Governance
*   All tool/agent interactions are **denied** unless an explicit policy grant exists.
*   **Preflight Checks:** Every tool activation request must pass a policy evaluation (OPA/Rego) against the current context.
*   **No Implicit Trust:** Tools from the same "publisher" do not automatically trust each other.

### 3.2 Provenance & Receipts
*   **Mandatory Receipts:** Every successful control plane operation (e.g., granting a credential, registering a tool) generates a cryptographically signed receipt.
*   **Ledger:** Receipts are stored in a tamper-evident append-only ledger (`@summit/receipts`).
*   **Traceability:** All issued credentials carry a claim linking back to the policy decision receipt ID.

### 3.3 Scoped Credential Brokering
*   **Just-in-Time (JIT) Access:** Credentials are minted on-demand for a specific session/context.
*   **Scope Restriction:** Credentials are scoped to the minimum required permissions (e.g., "read-only on repo X").
*   **Short-Lived:** Default TTL is 15 minutes; must be renewed via policy check.

### 3.4 Health & Lifecycle
*   **Heartbeats:** Registered tool servers must emit health heartbeats.
*   **Safe Degradation:** If a tool server is unhealthy, the Switchboard automatically revokes its active credentials and updates the registry status to `DRAINING`.
*   **Idempotency:** All control plane mutations (register, revoke, update) are idempotent. Replaying a request results in the same state and receipt.

## 4. Multi-Tenant Isolation
*   **Logical Separation:** Tenants are isolated by `OrganizationID` in the registry.
*   **Policy Boundaries:** Cross-tenant access is explicitly blocked by the root policy unless a "Federation Agreement" exists.
*   **Resource Quotas:** CPU/Memory/Token limits are enforced per tenant to prevent noisy neighbor issues.

## 5. Deterministic Routing Traces
*   While the *Data Plane* handles the bits, the *Control Plane* dictates the **allowed routes**.
*   **Route Policy:** The Switchboard generates a "Route Manifest" that the Data Plane must follow.
*   **Audit:** The Route Manifest is deterministic based on the request context and policy version. Any deviation is a policy violation.

## 6. Components
1.  **Registry Service:** Truth for available tools, agents, and their capabilities.
2.  **Policy Engine:** OPA/Rego based decision point.
3.  **Credential Broker:** Vault/OIDC integration for minting short-lived secrets.
4.  **Receipt Ledger:** Immutable log of all governance decisions.
