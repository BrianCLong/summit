# SUMMIT_ARCHIVE_SPEC — Canonical Archive & Historical Record

> **Mission (Objective A):** Preserve **what happened and why**, without preserving operational power.

## 1. Archive Manifest

The Canonical Archive consists of the following immutable components:

### 1.1. Core Decisions & Governance

- **Architectural Decision Records (ADR):** Complete set of ADRs, finalized and timestamped.
- **Governance Rulings:** History of Council decisions, vetoes, and policy shifts.
- **Refusal Events:** A log of "What Summit Declined To Do" — ethical boundaries enforced by the system.

### 1.2. Provenance-Sealed Timelines

- **System Lifecycle:** From genesis to decommissioning.
- **Simulation Outcomes:** Summarized results of major predictive runs (metadata only, no live replay capability).

### 1.3. Codebase Snapshot (Sanitized)

- **Source Code:** Full source, stripped of:
  - Operational secrets (API keys, salts).
  - Active signing keys.
  - Infrastructure configs specific to the live environment.
- **Documentation:** All user, developer, and operator manuals.

---

## 2. Archive Formats

### 2.1. Human-Readable

- **Format:** Markdown (`.md`), PDF (`.pdf`).
- **Requirement:** Must be legible without specialized Summit software.

### 2.2. Machine-Verifiable

- **Format:** JSON (`.json`), Merkle Tree Proofs.
- **Requirement:** Cryptographically linked to the `ProvenanceLedger`.

---

## 3. Schema Definitions

### 3.1. Refusal Event Schema

```json
{
  "event_id": "REF-2025-001",
  "timestamp": "ISO8601",
  "trigger": "User request description (sanitized)",
  "refusal_reason": "Violation of Ethical Guideline 4.2",
  "policy_citation": "policy/ethics/non-interference.rego",
  "outcome": "Request blocked; incident logged."
}
```

### 3.2. Simulation Summary Schema

```json
{
  "simulation_id": "SIM-ALPHA-99",
  "parameters": { ... },
  "result_summary": "Predicted instability in Sector 7.",
  "status": "ARCHIVED",
  "replay_token": "VOID"
}
```

---

## 4. Integrity Verification

### 4.1. Hashing

- Every file in the archive is hashed (SHA-256).
- A master `manifest.json` contains the hash tree.

### 4.2. Signing

- The master manifest is signed by the **Archive Steward Key** (before destruction).
- This signature serves as the "Final Seal."

---

## 5. Non-Operationalization

The archive is strictly **static**.

- **NO** Docker images capable of "one-click" revival.
- **NO** database dumps with user PII (schema only).
- **NO** active orchestration scripts.

_The goal is study, not resurrection._
