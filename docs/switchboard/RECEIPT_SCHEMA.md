# Switchboard Receipt Schema (Provenance) v0.1

## Purpose

Receipts provide a cryptographically verifiable, replayable record of every routing decision made by the Switchboard. They serve as the "flight recorder" for autonomous agents, ensuring that even if an agent hallucinates or is compromised, the *decision* to execute a tool is auditable.

## Required Fields

Every receipt JSON object MUST contain:

*   **`receipt_id`**: (UUID) Unique identifier for this receipt.
*   **`timestamp`**: (ISO 8601) Time of decision.
*   **`tenant_id`**: (String) Tenant this action belongs to.
*   **`actor_id`**: (String) ID of the Agent/User requesting the action.
*   **`intent_hash`**: (SHA-256) Hash of the raw intent/prompt provided by the agent.
*   **`policy_decision_ref`**: (Object)
    *   `decision`: "ALLOW" | "DENY"
    *   `policy_version`: SHA of the policy graph used.
    *   `eval_trace_id`: ID for the OPA evaluation trace.
*   **`capability_granted`**: (Object | null)
    *   `tool_name`: Name of the tool authorized.
    *   `scope`: Specific permissions granted (e.g., resource paths).
*   **`credential_ref`**: (String | null) ID/Hash of the ephemeral token issued (do not store the token itself).
*   **`inputs_redaction_policy`**: (String) "FULL" | "PARTIAL" | "NONE" indicating if input arguments were stored or hashed.
*   **`health_snapshot_id`**: (String) Reference to the system health state at time of decision.

## Storage Interface

*   **Write-Once**: Receipts are immutable once finalized.
*   **Append-Only**: Storage backend must support high-throughput appending (e.g., S3, specialized ledger).
*   **Retention**: Configurable per tenant (default: 1 year).

## Replay Contract

To "replay" a receipt means to re-execute the *decision logic* (not the tool) and verify the outcome matches.

1.  **Load Context**: Retrieve the Policy Graph and Registry state corresponding to `policy_version` and `timestamp`.
2.  **Re-evaluate**: Feed the original (or hashed) inputs into the Policy Engine.
3.  **Verify**: The output decision MUST match `policy_decision_ref.decision`.
4.  **Match**: If the re-evaluation produces a different result, the receipt is INVALID (indicating policy drift or tampering).

## Privacy Constraints & Redaction

*   **PII/PHI**: Arguments to tools (e.g., "email user X") may contain PII.
*   **Redaction**: By default, tool arguments are **hashed** before storage in the receipt.
*   **Exception**: Tenants may opt-in to encrypted full-text storage for audit purposes, using their own KMS keys.
*   **Secrets**: **NEVER** store raw secrets (API keys, passwords) in receipts, even encrypted.
