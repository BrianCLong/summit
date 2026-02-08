# Summit Switchboard (Control Plane) Specification v0.1

## Purpose

The **Summit Switchboard (Control Plane)** is the governed, graph-native agent sprawl control plane. It acts as the central authority for routing, policy enforcement, and provenance tracking for all agentic workflows. Its primary purpose is to ensure that no agent action occurs without explicit authorization, policy validation, and a replayable receipt.

## Non-Goals

*   **Execution**: The Control Plane does not execute agent logic or tools. That is the responsibility of the Data Plane (Agent Switchboard).
*   **Orchestration**: The Control Plane does not manage long-running workflow state or job scheduling. That is the responsibility of Maestro Conductor.
*   **Storage**: The Control Plane is not a general-purpose database for agent memory.

## Separation from Agent Switchboard (Data Plane)

*   **Control Plane (Summit Switchboard)**: Decision making, policy enforcement, credential issuance, receipt generation. "The Brain & The Guard".
*   **Data Plane (Agent Switchboard)**: Tool execution, data processing, model inference. "The Muscle".

## Trust Boundaries & Threat Assumptions

### Trust Boundaries

1.  **Untrusted Inputs**: All inputs from Agents, Users, or External Systems are treated as untrusted until validated against the Governance Policy Graph.
2.  **Trusted Core**: The Switchboard Core (Registry, Policy Engine, Credential Broker) operates within a hardened trust boundary.
3.  **Semi-Trusted Execution**: The Data Plane is semi-trusted; it is allowed to execute tools but only with credentials issued by the Control Plane for a specific, scoped interaction.

### Threat Assumptions

*   **Compromised Agent**: An agent may be compromised or hallucinate. The Control Plane must prevent it from accessing unauthorized resources.
*   **Leaked Credentials**: Long-lived credentials will be leaked. The Control Plane issues only short-lived, scoped credentials.
*   **Replay Attacks**: Attackers may try to replay valid requests. The Control Plane enforces strict nonce/timestamp validation and idempotency.

## Core Modules & Responsibilities

### 1. Registry & Discovery
*   **Responsibility**: Maintains the authoritative catalog of available Agents, Tools, and Policies.
*   **Mechanism**: A graph-based registry (Neo4j) that maps Actors to Capabilities.
*   **Lazy Expansion**: Supports JIT registration of new tools/agents, subject to policy approval.

### 2. Capability Model & Tool Surface
*   **Responsibility**: Defines *what* an agent can do.
*   **Model**: Capabilities are granular permissions (e.g., `s3:read:bucket-a`, `llm:invoke:gpt-4`).
*   **Tool Surface**: Maps abstract capabilities to concrete tool definitions (MCP, OpenAPI).

### 3. Policy & Identity (Preflight Gate)
*   **Responsibility**: The "Deny-by-Default" gatekeeper.
*   **Identity**: Verifies the identity of the requesting Agent/User.
*   **Policy Check**: Evaluates the request against the Governance Policy Graph (OPA/Rego).
*   **Enforcement**: Blocks any request that violates policy (e.g., dual-use restrictions, cost limits).

### 4. Credential Broker
*   **Responsibility**: Issues short-lived, scoped credentials for approved actions.
*   **Mechanism**: On successful policy check, mints a token (e.g., STS, JWT) valid *only* for the specific tool and target resource.
*   **Revocable**: Tokens can be revoked instantly.
*   **Logged**: Every issuance is strictly logged.

### 5. Health & Lifecycle
*   **Responsibility**: Monitors the health of the Control Plane and registered components.
*   **Lifecycle**: Manages the startup, shutdown, and drainage of Control Plane services.

### 6. Receipts & Provenance
*   **Responsibility**: Generates a cryptographic receipt for every decision and action.
*   **Traceability**: Receipts link the Request, Policy Decision, Credential Issued, and (eventually) Execution Result.
*   **Replayable**: Sufficient data is captured to replay and verify the decision logic.

## Minimal API Surface

### `POST /v1/route`
*   **Input**: `{ agent_id, intent, target_tool, context_hash }`
*   **Output**: `{ decision: "ALLOW" | "DENY", token: "...", receipt_id: "...", limitations: [...] }`
*   **Description**: Main entry point. Agents ask permission to do something.

### `POST /v1/register`
*   **Input**: `{ entity_type, definition, signature }`
*   **Output**: `{ entity_id, status }`
*   **Description**: Registers a new Agent, Tool, or Policy.

### `GET /v1/receipts/:id`
*   **Output**: `{ ...receipt_data... }`
*   **Description**: Retrieves a provenance receipt.

### `GET /v1/health`
*   **Output**: `{ status, version, uptime }`

## Failure Modes & Safe Degradation

*   **Policy Engine Failure**: Fails **CLOSED**. If policy cannot be evaluated, the request is DENIED.
*   **Registry Failure**: Fails **CLOSED**. If capabilities cannot be looked up, the request is DENIED.
*   **Credential Broker Failure**: Fails **CLOSED**. No credentials issued.
*   **Receipt Storage Failure**: Fails **CLOSED**. If a receipt cannot be persisted, the action is blocked (No Receipt = No Action).

## Multi-Tenant Isolation Model

*   **Logical Isolation**: All data (Registry, Policies, Receipts) is strictly partitioned by Tenant ID.
*   **Policy Isolation**: Tenants define their own policy overlays; a tenant cannot relax global safety invariants but can add stricter rules.
*   **Credential Isolation**: Credentials issued for one tenant are cryptographically bound to that tenant and cannot be used by another.
