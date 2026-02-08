# Caching & Idempotency Strategy (v0.1)

## Caching Strategy

### What to Cache
1.  **Capability Lists:** `Server -> [Capabilities]`. Expensive to fetch. Cache with TTL (e.g., 5m) + explicit invalidation on re-registration.
2.  **Compiled Policies:** OPA policy bundles. Cache aggressively.
3.  **Public Keys (JWKS):** For verifying JWTs.
4.  **Health Status:** "Healthy" status cached for short TTL (e.g., 10s) to reduce probe traffic.

### What NEVER to Cache
1.  **Credentials:** Ephemeral tokens (Vault/AWS/GCP) must strictly follow their TTL and revocation status.
2.  **Policy Decisions:** Context changes (time, rate limits) invalidate decisions instantly.
3.  **Receipts:** Must always be committed to persistent storage.

### Cache Key Design
*   Format: `sb:v1:{tenant_id}:{type}:{id_hash}`
    *   `tenant_id`: Ensures isolation.
    *   `type`: `cap` (capabilities), `pol` (policy), `health`.
    *   `id_hash`: SHA256 of the resource ID or composite key.

## Idempotency Strategy

Guarantees that retrying a request does not perform the side-effect twice.

### 1. Registration
*   **Key:** `server_url` + `tenant_id`
*   **Behavior:** Upsert. If exists, update metadata.

### 2. Routing / Tool Dispatch
*   **Key:** `X-Request-ID` (Client supplied UUID)
*   **Storage:** Redis (SETNX with TTL 24h).
*   **Logic:**
    1.  Check Redis for `req:{uuid}`.
    2.  If `status=processing`, return 409 (Conflict/TryLater).
    3.  If `status=done`, return stored result (Result Cache).
    4.  If not found, set `status=processing` and proceed.

### 3. Credential Issuance
*   **Key:** `req:{uuid}:cred`
*   **Behavior:** Bind credential to the Request ID. If a retry occurs for the same Request ID, return the *same* credential (if still valid) rather than minting a new one.

### 4. Receipt Commit
*   **Key:** `req:{uuid}:rcpt`
*   **Behavior:** Deduplicate. If a receipt for this Request ID exists, verify hash matches. If match, ACK. If mismatch, alert (integrity violation).

## Race Conditions & Safety

*   **Double-Dispatch:** Prevented by the atomic `SETNX` on the Idempotency Key at the ingress.
*   **Invalidation:**
    *   When a server is "Disabled", immediately delete its `cap` and `health` cache keys.
    *   When a policy is updated, bump the `policy_version` to invalidate all policy caches.
