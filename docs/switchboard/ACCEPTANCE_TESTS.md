# Summit Switchboard (Control Plane) Acceptance Tests

## Deny-by-Default Tool Activation

1.  **Scenario: Activation of Unregistered Tool**
    *   **Given** an Agent attempts to activate a tool 'unknown-tool'
    *   **When** the Agent sends a routing request to the Control Plane
    *   **Then** the Control Plane denies the request with "Tool Not Registered"
    *   **And** no credentials or receipt are issued.

2.  **Scenario: Activation of Registered Tool without Policy Approval**
    *   **Given** an Agent attempts to activate 'tool-a'
    *   **And** 'tool-a' is registered but policy 'policy-x' explicitly denies access to it for this Agent
    *   **When** the Agent sends a routing request
    *   **Then** the Control Plane denies the request with "Policy Violation: policy-x"
    *   **And** a receipt is generated recording the denial.

3.  **Scenario: Implicit Denial for Missing Permission**
    *   **Given** an Agent attempts to activate 'tool-b'
    *   **And** the Agent has no explicit permission granting access to 'tool-b'
    *   **When** the Agent sends a routing request
    *   **Then** the Control Plane denies the request (Deny-by-Default).

## Policy Preflight & Routing

4.  **Scenario: Successful Routing with Policy Approval**
    *   **Given** an Agent requests 'tool-c'
    *   **And** the Agent has explicit permission for 'tool-c'
    *   **And** all active policies pass
    *   **When** the routing request is processed
    *   **Then** the Control Plane approves the request
    *   **And** returns a scoped credential valid only for 'tool-c'.

5.  **Scenario: Per-Call Policy Evaluation**
    *   **Given** a policy restricts usage of 'tool-d' to "business hours only"
    *   **When** an Agent requests 'tool-d' during off-hours
    *   **Then** the request is denied
    *   **When** the same Agent requests 'tool-d' during business hours
    *   **Then** the request is approved.

## Scoped Credentials & Revocation

6.  **Scenario: Credential Scope Enforcement**
    *   **Given** a credential issued for 'tool-e'
    *   **When** the Agent attempts to use this credential for 'tool-f'
    *   **Then** the Data Plane rejects the execution.

7.  **Scenario: Credential Revocation**
    *   **Given** a valid credential for 'tool-g'
    *   **When** the Control Plane revokes the credential (e.g., due to anomaly detection)
    *   **Then** subsequent uses of that credential fail immediately.

8.  **Scenario: Audit Logging of Issuance**
    *   **Given** a credential is issued for 'tool-h'
    *   **When** the transaction completes
    *   **Then** an immutable audit log entry exists linking the Agent, Tool, and Token ID.

## Receipts & Determinism

9.  **Scenario: Receipt Generation for Every Call**
    *   **Given** any routing request (Approved or Denied)
    *   **When** the request is processed
    *   **Then** a cryptographic receipt is generated and returned
    *   **And** the receipt contains the Policy Version, Inputs Hash, and Decision.

10. **Scenario: Deterministic Routing Trace**
    *   **Given** a specific input set and fixed policy/registry state
    *   **When** the routing request is replayed multiple times
    *   **Then** the resulting decision and receipt hash are identical every time.

## Health & Failure Handling

11. **Scenario: Registry Unavailability**
    *   **Given** the Registry service is down
    *   **When** a routing request arrives
    *   **Then** the Control Plane returns a 503 error (Safe Failure)
    *   **And** the request is effectively denied (Fail Closed).

12. **Scenario: "Unknown" Behavior**
    *   **Given** an internal error occurs during policy evaluation
    *   **When** the decision cannot be reached
    *   **Then** the system defaults to DENY
    *   **And** logs a high-severity alert.

## Idempotency

13. **Scenario: Duplicate Request Handling**
    *   **Given** a request with a unique `request_id`
    *   **When** the same request is sent a second time
    *   **Then** the Control Plane returns the cached response/receipt from the first attempt
    *   **And** does not re-execute side effects (e.g., minting a new token).

## Multi-Tenant Isolation

14. **Scenario: Cross-Tenant Access Prevention**
    *   **Given** Agent A belongs to Tenant 1
    *   **And** Agent B belongs to Tenant 2
    *   **When** Agent A attempts to access resources or policies of Tenant 2
    *   **Then** the request is denied with "Unauthorized Tenant Access".

15. **Scenario: No Ambient Credentials**
    *   **Given** an Agent is instantiated
    *   **When** it inspects its environment variables or file system
    *   **Then** it finds no long-lived credentials (AWS keys, API tokens)
    *   **And** must request all access via the Switchboard.
