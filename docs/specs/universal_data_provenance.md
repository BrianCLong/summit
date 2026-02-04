# Universal Data Provenance (UDP) Specification

> **Status:** STANDARD DEFINITION
> **Owner:** Jules (Chief Architect)
> **Date:** 2026-01-28
> **Implements:** [Debezium Absorption Strategy](../strategy/debezium_3_4_absorption.md)

## 1. Overview

The **Universal Data Provenance (UDP)** system is the foundation of truth for the Summit platform. Unlike traditional lineage systems (e.g., OpenLineage) which track *where* data came from, UDP tracks *who* authorized it, *why* it was mutated, and *cryptographically proves* its integrity.

UDP transforms every data mutation into a **signed legal receipt**.

## 2. Architecture

The UDP architecture wraps commodity ingestion layers (like Debezium) in a cryptographic envelope.

```mermaid
graph TD
    subgraph "External World"
        DB[(Postgres 18)]
        API[External API]
    end

    subgraph "Ingestion Layer (Commodity)"
        Deb[Debezium 3.4 Engine]
        OL[OpenLineage Emitter]
    end

    subgraph "Summit Trust Plane"
        Agent[Ingest Agent]
        Policy[Policy Engine (OPA)]
        Signer[Key Management (KMS)]
        Ledger[(Security Ledger)]
    end

    subgraph "IntelGraph"
        Graph[(Knowledge Graph)]
    end

    DB -->|WAL Stream| Deb
    Deb -->|Raw Event| Agent
    OL -.->|Weak Signal| Agent

    Agent -->|Request Mutation| Policy
    Policy -->|Allow/Deny| Agent

    Agent -->|Sign Payload| Signer
    Signer -->|Signed Receipt| Agent

    Agent -->|Commit UEF| Ledger
    Ledger -->|Replay| Graph

    style Deb fill:#f9f,stroke:#333
    style Ledger fill:#9f9,stroke:#333
    style Agent fill:#99f,stroke:#333
```

## 3. Universal Evidence Format (UEF)

The UEF is the canonical schema for all data mutations. It exceeds the OpenLineage standard by enforcing **Identity**, **Intent**, and **Immutability**.

### 3.1 Schema Definition (ProvenanceEntryV2)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Universal Evidence Format (UEF)",
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Unique Event ID (ULID)" },
    "sequenceNumber": { "type": "integer", "description": "Monotonic sequence for ordering" },
    "previousHash": { "type": "string", "description": "SHA-256 of the previous entry (Merkle Chain)" },
    "currentHash": { "type": "string", "description": "SHA-256 of this entry" },
    "timestamp": { "type": "string", "format": "date-time" },
    "actor": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "type": { "enum": ["system", "user", "agent"] },
        "policyDecisionId": { "type": "string", "description": "Reference to OPA decision ID" }
      },
      "required": ["id", "type", "policyDecisionId"]
    },
    "payload": {
      "type": "object",
      "description": "The actual data mutation (e.g., Debezium change event)",
      "properties": {
        "mutationType": { "enum": ["CREATE", "UPDATE", "DELETE"] },
        "entityId": { "type": "string" },
        "before": { "type": "object" },
        "after": { "type": "object" }
      }
    },
    "witness": {
      "type": "object",
      "properties": {
        "signature": { "type": "string", "description": "Ed25519 signature of the hash" },
        "keyId": { "type": "string" }
      },
      "required": ["signature", "keyId"]
    }
  },
  "required": ["id", "previousHash", "currentHash", "actor", "witness"]
}
```

## 4. Competitive Exceedance: UDP vs. OpenLineage

| Feature | OpenLineage (Debezium 3.4) | Summit UDP |
| :--- | :--- | :--- |
| **Trust Model** | "The emitter says this happened." | "The Ledger proves this was authorized." |
| **Integrity** | None (Mutable Logs) | Merkle Chain (Tamper-Evident) |
| **Identity** | Service Name (e.g., "spark-job-1") | Agent Identity + Policy Decision ID |
| **Replay** | Not Native | Deterministic via Ledger Replay |
| **Scope** | Data Movement | Data Movement + Policy + Authorization |

## 5. Invariant Guarantees

1.  **No Ingestion Without Provenance:** The IntelGraph rejects any write operation that lacks a valid UEF signature.
2.  **Policy Before Commit:** No UEF entry can be generated without a corresponding Policy Decision ID from the Governance Engine.
3.  **Forward Security:** Compromising a key today does not invalidate the history (via hash chaining).

## 6. Implementation Strategy

To absorb Debezium 3.4:
1.  **Wrap Debezium:** Run Debezium as a "dumb pipe".
2.  **Intercept Events:** An `IngestAgent` listens to the Debezium stream.
3.  **Enrich & Sign:** The Agent requests policy approval, constructs the UEF entry, and signs it.
4.  **Commit:** The UEF entry is written to the Security Ledger (e.g., Immutable Postgres Log).
5.  **Project:** The Ledger is projected into the IntelGraph (Neo4j) for querying.
