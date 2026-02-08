# Switchboard Error Taxonomy (v0.1)

## Overview

This taxonomy defines canonical error codes for the Summit Switchboard. All errors emitted by the Switchboard must map to one of these codes.

**Key Principles:**
*   **Stable IDs:** Error codes (e.g., `SB-DISC-001`) are immutable.
*   **Deny-by-Default:** Any unknown state defaults to a deny error.
*   **No Leaky Secrets:** User-facing messages must never reveal internal topology, secrets, or specific policy logic that could aid an attacker.

## Error Code Format

`SB-<STAGE>-<ID>`

Stages:
*   `DISC`: Discovery
*   `CAP`: Capability Match
*   `POL`: Policy Preflight
*   `AUTH`: Credential Issuance / AuthZ
*   `ROUT`: Routing
*   `EXEC`: Tool Execution
*   `RCPT`: Receipt Logging
*   `LIFE`: Health / Lifecycle

## Taxonomy

### Discovery (DISC)

| Code | Meaning | Retriable? | User-Safe Message | Operator Message | Remediation | Receipt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SB-DISC-001` | MCP Server Not Found | No | Server not found. | Server ID '{serverId}' not in registry. | Check server registration. | Trace |
| `SB-DISC-002` | MCP Server Unreachable | Yes (backoff) | Server temporarily unavailable. | Connection refused/timeout to '{serverId}' at '{url}'. | Check server health/net. | Trace |
| `SB-DISC-003` | MCP Protocol Error | No | Server communication error. | Protocol violation: {details}. | Check MCP version compat. | Trace |

### Capability Match (CAP)

| Code | Meaning | Retriable? | User-Safe Message | Operator Message | Remediation | Receipt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SB-CAP-001` | Tool Not Found | No | Tool not found. | Tool '{toolName}' not found on server '{serverId}'. | Check tool name/server. | Trace |
| `SB-CAP-002` | Ambiguous Tool Ref | No | Ambiguous tool reference. | Multiple tools match '{toolName}'; require server qualification. | Qualify tool name. | Trace |
| `SB-CAP-003` | Schema Mismatch | No | Invalid arguments. | Args do not match schema for '{toolName}'. | Fix arguments. | Trace |

### Policy Preflight (POL)

| Code | Meaning | Retriable? | User-Safe Message | Operator Message | Remediation | Receipt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SB-POL-001` | Policy Deny | No | Action denied by policy. | Policy '{policyId}' denied: {reason}. | Review policy/request. | **Full** |
| `SB-POL-002` | Policy Error | Yes | Policy check failed. | OPA/Policy engine error: {error}. | Check policy engine. | **Full** |
| `SB-POL-003` | Dual-Use Block | No | Action blocked (Safety). | Dual-use keyword/pattern detected. | Review safety guidelines. | **Full** |

### Credential Issuance (AUTH)

| Code | Meaning | Retriable? | User-Safe Message | Operator Message | Remediation | Receipt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SB-AUTH-001` | Unauthorized | No | Unauthorized. | Principal '{user}' lacks role/scope for '{action}'. | Grant permissions. | Trace |
| `SB-AUTH-002` | Credential Mint Fail | Yes | Service error. | Failed to mint ephemeral credential for '{serverId}'. | Check Vault/KMS. | Trace |
| `SB-AUTH-003` | Token Expired | No | Token expired. | Bearer token expired at {time}. | Refresh token. | Trace |

### Routing (ROUT)

| Code | Meaning | Retriable? | User-Safe Message | Operator Message | Remediation | Receipt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SB-ROUT-001` | No Route | No | Service unavailable. | No healthy instances for '{serverId}'. | Check deployments. | Trace |
| `SB-ROUT-002` | Rate Limit | Yes (later) | Rate limit exceeded. | Tenant/Global rate limit hit for '{scope}'. | Slow down. | Trace |
| `SB-ROUT-003` | Circuit Breaker | Yes (later) | Service unavailable. | Circuit breaker open for '{serverId}'. | Wait for recovery. | Trace |

### Tool Execution (EXEC)

| Code | Meaning | Retriable? | User-Safe Message | Operator Message | Remediation | Receipt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SB-EXEC-001` | Tool Runtime Error | No | Tool execution failed. | Tool '{toolName}' threw: {error}. | Fix tool input/logic. | **Full** |
| `SB-EXEC-002` | Timeout | Yes | Execution timed out. | Tool '{toolName}' exceeded {timeout}ms. | Optimize/Inc timeout. | **Full** |
| `SB-EXEC-003` | Output Invalid | No | Invalid tool output. | Output failed validation/policy check. | Fix tool output. | **Full** |

### Receipt Logging (RCPT)

| Code | Meaning | Retriable? | User-Safe Message | Operator Message | Remediation | Receipt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SB-RCPT-001` | Commit Failed | Yes | System error. | Failed to persist receipt to ledger. | Check DB/Storage. | Log |
| `SB-RCPT-002` | Signing Failed | Yes | System error. | Failed to sign receipt. | Check HSM/Key. | Log |

### Health / Lifecycle (LIFE)

| Code | Meaning | Retriable? | User-Safe Message | Operator Message | Remediation | Receipt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SB-LIFE-001` | Server Quarantined | No | Service unavailable. | Server '{serverId}' is quarantined. | Resolve quarantine. | Trace |
| `SB-LIFE-002` | Deprecated | No | Service deprecated. | Version '{ver}' is EOL. | Upgrade. | Trace |
