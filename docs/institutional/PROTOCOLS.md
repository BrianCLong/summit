# Protocol Definitions & Standards

> **Status:** DRAFT
> **Owner:** Protocolization & Standards Agent
> **Classification:** TECHNICAL STANDARD
> **Parent:** `INSTITUTIONAL_STRATEGY.md`

## 1. Mission

To define **which Summit interfaces become protocols** to ensure interoperability and inevitability, while preserving the proprietary nature of the core intelligence.

**Principle:** "What must be shared so Summit becomes unavoidable?"

## 2. Candidate Protocol Layers

The following interfaces are designated for standardization. These will be specified in RFC-style documents, versioned strictly, and accompanied by compliance test suites.

### 2.1. Provenance Manifest Protocol (PMP)

- **Purpose:** A standard format for asserting the origin, lineage, and integrity of cognitive data and decisions.
- **Scope:**
  - Cryptographic signatures of data atoms.
  - Chain of custody assertions.
  - Tool/Agent identity attestation.
- **Artifacts:** JSON-LD schema, CBOR encoding spec.

### 2.2. Policy Decision Interface (PDI)

- **Purpose:** A standard interface for requesting and receiving policy evaluations (Allow/Deny/Modify) from a sovereign policy engine.
- **Scope:**
  - Input context schema (User, Resource, Action, Environment).
  - Decision output schema (Effect, Obligations, Advice).
  - OPA/Rego compatibility layer.
- **Artifacts:** gRPC service definition, OpenAPI spec.

### 2.3. Audit Event Schema (AES)

- **Purpose:** A unified taxonomy for recording security, governance, and operational events across the ecosystem.
- **Scope:**
  - Event classification (Authentication, Data Access, System Change).
  - Actor attribution standards.
  - Tamper-evident chaining requirements.
- **Artifacts:** Avro/Protobuf schema.

### 2.4. Simulation Scenario DSL (SimDSL)

- **Purpose:** A declarative language for defining simulation scenarios, threat models, and wargame parameters.
- **Scope:**
  - Entity definition.
  - Event timeline sequencing.
  - Interaction rules and victory conditions.
- **Artifacts:** EBNF grammar, YAML schema.

## 3. Standardization Process

All protocols follow a strict lifecycle:

1.  **Draft:** Internal proposal and experimental implementation.
2.  **RFC:** Request for Comments from trusted partners/advisory council.
3.  **Candidate:** Frozen spec with a reference implementation (minimal).
4.  **Standard:** Published spec with a full Compliance Test Suite.
5.  **Deprecated:** Superseded by a newer version (with migration path).

## 4. Proprietary Boundaries (Non-Protocols)

The following areas are explicitly **excluded** from standardization and remain proprietary to Summit:

- **Inference Engines:** The internal logic of how decisions are reached.
- **Optimization Algorithms:** Scheduling, resource allocation, and graph traversal optimizations.
- **User Experience (UX):** The specific workflows, visualizations, and interaction models of the Summit console.
- **Simulation Fidelity:** The specific physics, psychological models, and high-fidelity data used in simulations (though the DSL is standard).

## 5. Compliance & Verification

- No protocol is released without a **Compliance Test Suite**.
- Third-party implementations must pass 100% of the suite to claim compatibility.
- The "Summit Certified" mark is reserved for implementations that pass rigorous interoperability testing.
