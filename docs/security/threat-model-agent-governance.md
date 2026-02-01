# Threat Model: Agent Governance

## 1. Threats to Address

*   **Prompt Injection → Tool Abuse**: Agent coerced to exfiltrate or execute destructive tools.
    *   *Mitigation*: Deterministic Action Envelope (DAE) enforces allowed tools and policy bounds. High-risk actions require approval.
*   **Privilege Escalation**: Agent runs under broader permissions than user intent.
    *   *Mitigation*: Least-privilege execution modes. DAE checks policy per action.
*   **Log Tampering**: Attacker modifies audit trail post hoc.
    *   *Mitigation*: Tamper-evident hash-chained ledger (`HashChainLedger`). Verification on read.
*   **Cross-Tenant Leakage**: Multi-tenant event store mistakes.
    *   *Mitigation*: Tenant-scoped keys and partitions (Logic separation in code, Partitioning in Store).
*   **Shadow Policy Bypass**: Direct tool invocation bypasses DAE.
    *   *Mitigation*: Middleware wrapping mandatory for tool execution context.

## 2. Cryptographic Integrity

*   **Hash Chain**: Each event includes the hash of the previous event.
    *   `Hash(Event_N) = SHA256(CanonicalJson(Event_N_Data + PrevHash))`
*   **Verification**:
    *   Sequential scan of the chain verifies links.
    *   Any modification of Event_N invalidates Hash(Event_N) which invalidates PreviousHash(Event_N+1).

## 3. Security Regression Tests

*   **Tamper Detection**: `tests/governance/test_hashchain_ledger.py` explicitly tests modification detection.
*   **Bypass Prevention**: `tests/governance/test_dae_bounds.py` explicitly tests policy denial and limits.

## 4. Supply Chain

*   **SBOM**: Generated via CI.
*   **Dependencies**: Pinned versions in `requirements.in`.
