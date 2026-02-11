# Switchboard v0.1 PR Plan

This plan outlines 8 atomic PRs to deliver the Summit Switchboard (Control Plane) v0.1.
**Constraint**: Every PR must preserve **Deny-by-Default** (no "temporary allow-all").

## PR-1: Policy Engine Core & Preflight Gate
*   **Goal**: Establish the "Deny-by-Default" baseline. No traffic flows without a policy check.
*   **Files**: `server/src/switchboard/policy/`, `schemas/gov/policy_graph.json`
*   **Tests**: Unit tests for policy evaluator; ensure explicit DENY for empty/missing policies.
*   **Risks**: Blocking valid traffic if policy definitions are missing.
*   **Evidence**: `report.json` showing 100% block rate for unconfigured requests.
*   **Dependencies**: None.

## PR-2: Registry & Capability Model Schema
*   **Goal**: Define the "Phonebook" of Actors and Capabilities.
*   **Files**: `server/src/switchboard/registry/`, `schemas/switchboard/registry.v0.1.json`
*   **Tests**: Schema validation tests; registry CRUD operations.
*   **Risks**: Schema churn requiring migrations later.
*   **Evidence**: Successful registration of a test Agent and Tool.
*   **Dependencies**: PR-1 (Policy checks registry existence).

## PR-3: Credential Broker (Scoped Token Minting)
*   **Goal**: Issue short-lived, scoped credentials for approved actions.
*   **Files**: `server/src/switchboard/auth/broker.ts`, `server/src/switchboard/crypto/`
*   **Tests**: Token validation; scope enforcement tests; expiration tests.
*   **Risks**: Leaking minting keys (requires secure secret management).
*   **Evidence**: Generated token works *only* for target scope and expires.
*   **Dependencies**: PR-1, PR-2.

## PR-4: Receipt Generation & Provenance Ledger
*   **Goal**: Generate a cryptographic receipt for every routing decision.
*   **Files**: `server/src/switchboard/receipts/`, `schemas/receipt.v0.1.json`
*   **Tests**: Receipt determinism; hash verification.
*   **Risks**: Performance overhead of synchronous receipt generation.
*   **Evidence**: `receipt.json` matches schema and verifies against input hash.
*   **Dependencies**: PR-1 (Receipts record policy decisions).

## PR-5: Control Plane API Surface (v1/route)
*   **Goal**: Expose the routing endpoint to Agents.
*   **Files**: `server/src/switchboard/api/routes.ts`, `server/src/switchboard/server.ts`
*   **Tests**: Integration tests for `/v1/route`; load tests.
*   **Risks**: API incompatibility with existing agents.
*   **Evidence**: `curl` request returns valid decision + token + receipt.
*   **Dependencies**: PR-3, PR-4.

## PR-6: Health & Lifecycle Management
*   **Goal**: Monitoring, graceful shutdown, and "Fail Closed" logic.
*   **Files**: `server/src/switchboard/health/`, `ops/dashboards/switchboard_health.json`
*   **Tests**: Chaos testing (kill registry -> API returns 503).
*   **Risks**: False positives in health checks causing unnecessary downtime.
*   **Evidence**: Dashboard shows UP/DOWN status correctly.
*   **Dependencies**: PR-5.

## PR-7: Multi-Tenant Isolation Enforcers
*   **Goal**: Strict partitioning of Registry and Policy by Tenant ID.
*   **Files**: `server/src/switchboard/middleware/tenancy.ts`
*   **Tests**: Cross-tenant access attempts (MUST FAIL).
*   **Risks**: Leaking data across tenant boundaries.
*   **Evidence**: Tenant A cannot read Tenant B's registry.
*   **Dependencies**: PR-2, PR-5.

## PR-8: Agent SDK Integration (Minimal Client)
*   **Goal**: Simple client library for Agents to call the Switchboard.
*   **Files**: `packages/switchboard-client/`
*   **Tests**: End-to-end flow with a sample agent.
*   **Risks**: SDK complexity adoption barrier.
*   **Evidence**: Example agent code is clean and functional.
*   **Dependencies**: PR-5.
