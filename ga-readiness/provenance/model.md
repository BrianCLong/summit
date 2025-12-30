# Provenance Data Model

**Based on:** `ProvenanceLedgerV2`
**Compliance:** W3C PROV-O-ish

## Entities
*   **Activity:** An action taken by an Agent (e.g., `ingest_document`, `run_query`).
*   **Agent:** The actor (User or Service).
*   **Entity:** The data artifact (File, Graph Node, Report).
*   **Claim:** An assertion made about an Entity.
*   **Evidence:** Supporting data for a Claim.

## Schema (JSON Structure)
```json
{
  "id": "uuid-v4",
  "timestamp": "ISO-8601",
  "type": "activity | entity | agent",
  "actor_id": "user-uuid",
  "tenant_id": "org-uuid",
  "action": "CREATE | UPDATE | DELETE",
  "details": {
    "method": "api_call",
    "inputs": { ... },
    "outputs": { ... }
  },
  "hash": "sha256(prev_hash + current_content)",
  "signature": "RSA-2048-Sign(hash)"
}
```

## Ledger Verification
1.  **Fetch Chain:** Retrieve all logs for a Tenant/Time-window.
2.  **Verify Hash:** `Hash(N) == SHA256(Hash(N-1) + Content(N))`
3.  **Verify Sig:** `Verify(Content(N), Signature(N), PublicKey)`
4.  **Audit:** Flag any breaks in the chain.

## Storage
*   **Hot:** PostgreSQL (`provenance_events`)
*   **Cold:** S3 (Immutable, Object Lock enabled)
