# Data Correctness Invariants

This document defines the canonical invariants for Tier-0 objects. These invariants must be enforced at write boundaries (API, Service Layer, Job Processors) and verified by reconciliation jobs.

## Tier-0 Objects

1.  **Organization (Tenant)**
    *   **Core Entity**: Represents the customer boundary.
    *   **Source of Truth**: PostgreSQL `tenants` table.
2.  **User**
    *   **Core Entity**: Represents an authenticated identity.
    *   **Source of Truth**: PostgreSQL `users` table.
3.  **MaestroRun (Job)**
    *   **Core Entity**: Represents an execution unit of a pipeline.
    *   **Source of Truth**: PostgreSQL `runs` table.
4.  **ProvenanceEntry (Audit/Ledger)**
    *   **Core Entity**: Immutable record of system state changes.
    *   **Source of Truth**: PostgreSQL `provenance_ledger_v2` table (append-only).

---

## 1. Organization (Tenant)

### Invariants

*   **Uniqueness**:
    *   `id` must be globally unique (UUID).
    *   `slug` must be globally unique and immutable once set.
*   **State Transitions**:
    *   `status` must be one of: `active`, `suspended`, `disabled`, `archived`.
    *   `active` -> `suspended` (manual or automated trigger).
    *   `suspended` -> `active` (manual review).
    *   `active`/`suspended` -> `disabled` (offboarding).
    *   `disabled` -> `archived` (data retention expiry).
    *   **Invariant**: Cannot transition from `disabled` back to `active` without explicit reactivation flow (new subscription).
*   **Constraints**:
    *   `tier` must be a valid service tier (`starter`, `pro`, `enterprise`).
    *   `residency` is immutable after creation (`US`, `EU`).
    *   Configuration must adhere to the schema defined for the `tier`.
*   **Relationships**:
    *   Must have at least one `User` with `role: 'ADMIN'` upon creation.

## 2. User

### Invariants

*   **Uniqueness**:
    *   `email` must be unique per `tenant_id` (or globally depending on auth model - currently assuming multi-tenant/SaaS model where email is global identifier).
    *   *Clarification*: If email is global, `email` is unique in `users` table.
*   **State Transitions**:
    *   `status`: `invited` -> `active` -> `locked` -> `deactivated`.
    *   `invited` -> `active`: Requires email verification + password set.
*   **Constraints**:
    *   `tenant_id` must reference a valid, non-archived Tenant.
    *   `role` must be valid for the Tenant's `tier`.
*   **Security**:
    *   `password_hash` must never be null for `active` users (unless SSO).
    *   `mfa_enabled` must be true if Tenant policy requires it.

## 3. MaestroRun (Job)

### Invariants

*   **Uniqueness**:
    *   `id` is globally unique (UUID).
    *   `idempotency_key` (if provided) guarantees exactly-once execution per tenant.
*   **State Transitions**:
    *   Finite State Machine: `queued` -> `running` -> `succeeded` | `failed` | `cancelled`.
    *   **Terminal States**: `succeeded`, `failed`, `cancelled` are final. No transitions allowed out of these states.
    *   **Ordering**: `created_at` <= `started_at` <= `completed_at`.
*   **Constraints**:
    *   `pipeline_id` must exist.
    *   `tenant_id` is mandatory and immutable.
    *   `executor_id` must be set when state is `running`.
    *   `duration_ms` must be present if state is terminal.
*   **Cost**:
    *   `cost` must be non-negative.
    *   `cost` is finalized only in terminal states.

## 4. ProvenanceEntry

### Invariants

*   **Immutability**:
    *   Rows are **never** updated or deleted (WORM compliance).
*   **Chain Integrity**:
    *   `sequence_number` must be strictly increasing per `tenant_id` (n, n+1).
    *   `previous_hash` of entry N must equal `current_hash` of entry N-1.
    *   `current_hash` must be a valid SHA-256 hash of the entry's canonical content (including `previous_hash`).
*   **Constraints**:
    *   `actor_id` and `actor_type` are mandatory.
    *   `resource_id` and `resource_type` are mandatory.
    *   `timestamp` cannot be in the future.
