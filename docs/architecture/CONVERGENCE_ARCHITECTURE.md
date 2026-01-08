# Convergence Architecture

**Mission**: Force all absorbed systems into Summit’s control plane to ensure **One Control Plane, One Truth Model**.

## Data Model Normalization

Absorbed systems must not maintain siloed "Sources of Truth". Data must be projected into the Summit Knowledge Lattice.

### The Lattice Pattern

- **Entities**: Map local entities (e.g., `User`, `Customer`) to Canonical Entities (`Person`, `Organization`).
- **Edges**: Relationship logic must be converted to Graph Edges.
- **Provenance**: All data mutations must generate a Provenance Event linked to the `ProvenanceLedger`.

### Migration Strategy

1.  **Double Write**: Write to Legacy DB and Summit Graph simultaneously (controlled by Summit).
2.  **Backfill**: Batch process historical data into the Graph.
3.  **Read Switch**: Switch read paths to Summit Graph.
4.  **Disconnect**: Remove Legacy DB write path.

## Identity & Policy Unification

### Authentication (AuthN)

- **Legacy Auth**: Must be disabled.
- **Summit Auth**: All requests must be authenticated via Summit's `AuthService` (OIDC/JWT).
- **Service Accounts**: Absorbed backend services must use mTLS/SPIFFE or Summit-issued Service Tokens.

### Authorization (AuthZ)

- **Legacy Logic**: Hardcoded checks (e.g., `if user.role == 'admin'`) must be removed.
- **OPA Policy**: Access decisions must be delegated to Open Policy Agent (OPA).
  - _Input_: `user`, `resource`, `action`.
  - _Policy_: defined in `policy/`.

## The "Hard Rules" of Convergence

1.  **No Parallel Auth**: If a user has to log in twice, the integration is failed.
2.  **No Parallel Policy Engines**: No separate RBAC tables or logic.
3.  **No Shadow Data Stores**: Data may be cached locally for performance, but the Graph is the Master.
4.  **No Duplicate UI**: Admin functions must move to the Summit Console.

## Decommissioning Protocol

Legacy systems are "Life Support" only.

- **Read-Only Mode**: Enforce at the database level where possible.
- **Traffic Tapping**: Verify no undocumented clients are connecting.
- **Scream Test**: Temporarily disable access to identify hidden dependencies.
