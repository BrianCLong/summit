# Summit Switchboard (Control Plane) Acceptance Tests

## 1. Tool Activation (Policy Preflight)

### Scenario: Compliant Tool Registration
*   **Given** a tool server running `image:verified-tool-v1` signed by `SummitCA`
*   **And** the Organization `acme-corp` has a policy allowing verified tools
*   **When** the tool attempts to register with the Switchboard
*   **Then** the registration succeeds with status `ACTIVE`
*   **And** a `REGISTRATION_RECEIPT` is written to the ledger

### Scenario: Non-Compliant Tool Blocked
*   **Given** a tool server running `image:untrusted-v2` (unsigned)
*   **When** the tool attempts to register
*   **Then** the request is rejected with `403 Forbidden` (Policy Violation)
*   **And** a `DENIAL_RECEIPT` is logged

## 2. Credential Scope Issuance

### Scenario: Least-Privilege Scope
*   **Given** an active tool `repo-reader` needing `read` access to `repo-x`
*   **And** the tool requests credentials for `read, write` (excessive)
*   **When** the credential request is processed
*   **Then** the Switchboard issues a token scoped ONLY to `read` (per policy override) or Denies completely
*   **And** the receipt explicitly lists the requested vs. granted scopes

### Scenario: Expired Credential Refresh
*   **Given** a token issued 16 minutes ago (TTL 15m)
*   **When** the tool attempts to use the token for a control plane action
*   **Then** the request fails with `401 Unauthorized`
*   **And** the tool must re-authenticate to get a fresh token

## 3. Provenance & Receipts

### Scenario: Receipt Integrity
*   **Given** a sequence of 10 successful operations
*   **When** an auditor queries the Receipt Ledger for the last operation
*   **Then** the receipt contains a hash of the previous receipt (integrity chain)
*   **And** the receipt signature validates against the Switchboard public key

### Scenario: Deterministic Receipt ID
*   **Given** a specific policy evaluation request (Context A, Policy B)
*   **When** the request is replayed 5 times
*   **Then** the resulting Receipt ID is identical (Idempotency)

## 4. Multi-Tenant Isolation

### Scenario: Cross-Tenant Access Blocked
*   **Given** Tenant A trying to register a tool with Tenant B's credentials
*   **When** the registration request is sent
*   **Then** the request is denied immediately
*   **And** a security alert is triggered for "Tenant Boundary Violation"

## 5. Safe Degradation (Health)

### Scenario: Unhealthy Tool Eviction
*   **Given** an active tool `search-service` missing 3 consecutive heartbeats
*   **When** the health check monitor runs
*   **Then** the tool status transitions to `DRAINING`
*   **And** all active credentials for that instance are revoked
*   **And** routing policies are updated to exclude this instance
