# Summit Switchboard (Control Plane) PR Plan

## Strategy
*   **Atomic:** Each PR is independently deployable and testable.
*   **Fail-Safe:** Rollback is trivial (mostly stateless or append-only).
*   **Sequence:** Build core -> Policy -> Creds -> Integration.

## PR 1: Scaffold & Registry Service
*   **Description:** Initialize `services/switchboard-registry`. Define Tool and Agent schemas (OpenAPI/gRPC). In-memory or basic DB storage.
*   **Tests:** Unit tests for registration/deregistration API.
*   **Rollback:** Revert commit; no data migration yet.

## PR 2: Policy Engine (OPA Integration)
*   **Description:** Add `services/switchboard-policy`. Integrate OPA/Rego. Create `policies/switchboard/preflight.rego`.
*   **Tests:** Unit tests for Rego policies (allow/deny scenarios).
*   **Rollback:** Disable policy check middleware.

## PR 3: Registry Policy Enforcement
*   **Description:** Update Registry to call Policy Engine before accepting registration. Implement "Deny-by-Default".
*   **Tests:** Integration test: register valid vs. invalid tool.
*   **Rollback:** Feature flag to bypass policy check.

## PR 4: Receipt Ledger (Provenance)
*   **Description:** Add `libs/receipts` for signature generation. Add `services/switchboard-ledger` (append-only log).
*   **Tests:** Verify receipt signature, hash chain integrity.
*   **Rollback:** Disable receipt generation (log-only mode).

## PR 5: Credential Broker (Scoped Access)
*   **Description:** Add `services/switchboard-creds`. Implement token minting interface (Vault/OIDC wrapper).
*   **Tests:** Mint token with specific scope, verify validation failure for out-of-scope access.
*   **Rollback:** Revert to static/dummy credentials.

## PR 6: Health Monitor & Lifecycle
*   **Description:** Add `services/switchboard-health`. Implement heartbeat endpoint and background reaper for stale tools.
*   **Tests:** Simulate missing heartbeats -> verify `DRAINING` status.
*   **Rollback:** Disable background reaper.

## PR 7: Multi-Tenancy Enforcement
*   **Description:** Add tenant isolation middleware. Enforce `OrganizationID` boundaries in Registry and Policy.
*   **Tests:** Cross-tenant access attempt (should fail).
*   **Rollback:** Relax tenant check to warning-only.

## PR 8: Audit API & Viewer
*   **Description:** Add read-only API to query the Receipt Ledger. Simple CLI or UI viewer.
*   **Tests:** Query receipts by ID, Tool, or Time.
*   **Rollback:** Remove API endpoint.

## PR 9: End-to-End Integration Tests
*   **Description:** Add full suite of acceptance tests (Given/When/Then) running against the full stack.
*   **Tests:** Run all scenarios from `ACCEPTANCE_TESTS.md`.
*   **Rollback:** N/A (Test only).

## PR 10: Documentation & Release
*   **Description:** Finalize `SPEC.md`, API docs, and "Which Switchboard?" guides.
*   **Tests:** Link checks, formatting.
*   **Rollback:** Revert doc changes.
