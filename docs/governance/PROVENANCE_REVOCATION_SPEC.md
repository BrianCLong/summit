# Provenance Revocation Standard (Merkle Tree)

**Status:** Draft
**Owner:** Governance / Security
**Source:** Zero-Trust MCP Whitepaper (2026-01)
**Related:** Immutable Audit Log (C2)

## 1. Overview
To meet FedRAMP High and GDPR requirements, Summit must support **retroactive invalidation** of analytic outputs derived from poisoned or non-compliant sources. This standard defines the **Merkle Tree Provenance** mechanism for transitive contamination tracking.

## 2. Core Mechanism

### 2.1 Merkle DAG Structure
All provenance entries in the `ProvenanceLedger` must be organized as a Directed Acyclic Graph (DAG) with Merkle properties:
*   **Node:** Represents a processing step or context ingestion.
*   **Hash:** `H(content + parent_hashes)`.
*   **Property:** Invalidation of a root node (Source) strictly identifies all descendant nodes (Outputs) via hash traversal.

### 2.2 Revocation Certificates
Revocation is triggered by a signed **Revocation Certificate**:
```json
{
  "target_resource_id": "source:12345",
  "reason": "POISONED_DATA",
  "timestamp": "2026-01-25T12:00:00Z",
  "signature": "sig_admin_key_..."
}
```

## 3. Implementation Requirements

### 3.1 Ledger Schema Updates
The `ProvenanceEntryV2` interface must support:
*   `merkleRoot`: Hash of the root source(s).
*   `parentHash`: Hash of the immediate predecessor.

### 3.2 Propagation Logic
Upon receipt of a Revocation Certificate:
1.  **Identify** all Ledger entries where `resourceId == target_resource_id`.
2.  **Traverse** the graph downstream using `parentHash` links.
3.  **Mark** all reachable nodes as `REVOKED`.
4.  **Emit** `ComplianceAlert` for any active systems using revoked contexts.

## 4. Compliance Mapping
*   **GDPR Art. 17:** Right to Erasure (Delete derived data).
*   **SEC Reg SCI:** System Compliance (Recall contaminated models).
*   **NIST SP 800-53:** Information Integrity.
