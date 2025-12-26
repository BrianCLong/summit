# Architectural Pressure Points (2025-Q4 RFC Sprint)

This document defines the critical architectural limitations identified during the Q4 2025 Architecture Exploration Sprint.

## 1. Maestro Orchestrator Scalability & Coupling

### Problem Statement
The `MaestroService` is currently a singleton that loads its entire state (`MaestroDB`) from a single JSON file (`maestro_db.json`) into memory on startup. This "God Class" pattern manages control loops, experiments, playbooks, agents, and audit logs within a single process memory space.

### Current Limitations
- **Single Point of Failure**: If the `MaestroService` process crashes, all active orchestration state is lost/reset to the last disk save.
- **Vertical Scaling Only**: The in-memory model prevents running multiple Maestro instances (horizontal scaling) because they would overwrite each other's `db.json` and have divergent in-memory states.
- **Blocking Operations**: The service performs synchronous file I/O (`await fs.writeFile`) and large JSON parsing/stringifying on the main event loop, which will cause latency spikes as the dataset grows.
- **Tight Coupling**: Orchestration logic (Agents, Loops, Experiments) is tightly coupled to the persistence mechanism.

### Non-Goals
- We are not trying to replace the *concept* of Maestro (central conductor).
- We are not optimizing for "millions of concurrent flows" yet, but "hundreds of concurrent complex agentic flows" which the current JSON-file-DB cannot reliably support.

### Invariants to Preserve
- The API surface for `MaestroService` (e.g., `getHealthSnapshot`, `runExperiment`) must remain stable or backward compatible.
- The "Autonomic Loop" concept must be preserved.

---

## 2. Provenance Ledger Write Throughput & Integrity

### Problem Statement
The `ProvenanceLedgerV2` is designed for high-integrity compliance but uses a synchronous `BEGIN -> INSERT -> COMMIT` flow for every single entry (`appendEntry`). While `batchAppendEntries` exists, the core design around strictly serial `sequence_number` generation per tenant creates a database "hot spot" and limits write throughput.

### Current Limitations
- **Sequence Contention**: High-concurrency writes for the same `tenant_id` will face lock contention on the `provenance_ledger_v2` table to ensure gapless sequence numbers.
- **Synchronous Bottleneck**: The API caller must wait for the full DB round-trip + witness verification before an event is considered "logged". This adds significant latency to critical paths (like "Agent thought generation").
- **Monolithic Storage**: Storing all payloads in a single Postgres table (`JSONB`) will bloat the primary database quickly, making maintenance (VACUUM, backups) difficult.

### Non-Goals
- We are not relaxing the requirement for a tamper-evident hash chain.
- We are not moving off PostgreSQL as the primary source of truth *yet* (though we might explore tiering).

### Invariants to Preserve
- Every entry must have a cryptographically verifiable `previous_hash` link.
- No gaps in `sequence_number` per tenant.
- WORM storage archival must be guaranteed eventually.
