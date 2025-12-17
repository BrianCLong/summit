# Summit Repository: Missing Surfaces Matrix & Audit Report

**Date:** October 2025
**Auditor:** Jules (System Architect)
**Status:** Critical Gaps Identified

## Executive Summary
A full-surface audit of the Summit repository reveals a significant divergence between the "First Principles" architectural vision and the current codebase state. The repository suffers from "Ghost References" (critical infrastructure cited in docs but absent in code), "Package Sprawl" (hundreds of aspirational but empty/unused packages), and a monolithic service layer that resists the intended move to an agentic architecture.

## 1. Missing Surfaces Matrix

| Surface / Component | Status | Evidence / Location | Risk | Priority | Findings |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IntelGraphService.ts** | 👻 **Ghost Reference** | Referenced in `FIRST_PRINCIPLES_REDESIGN.md` as core sync logic, but **does not exist**. | **Critical** | **P0** | The document blames this specific file for "Fragile Sync", but the logic is likely scattered or the file was renamed/never committed. |
| **Cognitive Engine** | ❌ **Missing** | `apps/cognitive-engine` (Python/Rust) is missing. AI logic remains trapped in `server/src/services/` monolith. | **High** | **P0** | Blocks the "Brain" architecture. AI features are tightly coupled to the Node.js monolith. |
| **Package Ecosystem** | 🚧 **Fake/Sprawl** | `packages/` contains hundreds of directories (e.g., `missile-intelligence`) which appear to be empty shells or placeholders. | **Medium** | **P1** | "Resume Driven Development" artifacts. Obscures actual architecture. confusing for new devs. |
| **PSC Runner** | ⚠️ **Mismatch** | `rust/psc-runner` exists but implements "Attestation/Enclave" logic, NOT the "Heavy Graph Algorithms" described in the roadmap. | **Medium** | **P1** | The "Rust Runner" capability is currently a security tool, not a performance tool. |
| **Frontend State** | ⚠️ **Identity Crisis** | `apps/web` (Summit) vs `client/` (Legacy). Docs critique `graphSlice` (found in `client/`) but imply it affects the new app. | **Medium** | **P2** | Confusion over which frontend is the "real" Summit. `apps/web` state management is different from what docs critique. |
| **Service Layer** | 📉 **Bloated** | `server/src/services` contains ~150 files. Mixes business logic, data access, and API glue. | **High** | **P1** | Validates the "Service Bloat" critique. Monolithic structure makes refactoring dangerous. |
| **Provenance Ledger** | 🟡 **Partial** | `server/src/services/provenance-ledger.ts` exists and implements `ProvenanceLedgerService` (with TimescaleDB), but `packages/prov-ledger` also exists. | **Low** | **P2** | Duplication/Ambiguity between the monolithic service and the extracted package. |

## 2. Detailed Findings

### A. The "Ghost" of IntelGraphService
The `docs/FIRST_PRINCIPLES_REDESIGN.md` document explicitly names `IntelGraphService.ts` as the root cause of the "Dual Write Problem".
> *"The `IntelGraphService` manually writes to Neo4j and then Postgres. If one fails, data is corrupted."*

**Reality:** This file does not exist in the codebase.
**Implication:** The documentation is either outdated, referencing a deleted file, or describing a conceptual component. The actual sync logic likely resides in `IntelCorroborationService.ts` or is distributed across `GlobalIngestor.js` and `GraphOpsService.js`.

### B. "Package Sprawl" & Aspirational Architecture
The `packages/` directory is a "Potemkin Village" of modules. It lists advanced capabilities (`quantum-ml`, `nuclear-monitoring`) that are likely empty scaffolds.
**Action:** A script should be run to identify and delete empty packages to reduce noise.

### C. The "Split Brain" Frontend
The repository contains two major frontend applications:
1.  `client/`: Appears to be the legacy/reference implementation. Contains the massive 14KB `graphSlice.js` critiqued in the docs.
2.  `apps/web/`: The newer "Summit" application. Uses Redux Toolkit but lacks the specific `graphSlice` structure mentioned.

**Risk:** Developers might fix issues in `client/` thinking they are fixing "Summit", while the real production app is `apps/web`.

### D. Missing "Cognitive Lattice"
The architecture demands a "Cognitive Runtime" (The Brain) separate from the "Spine" (Event Log) and "View" (Projections).
**Current State:**
-   **Spine:** Implemented via `ProvenanceLedgerService` (Postgres/Timescale), but not strictly enforced as the *only* write path.
-   **Brain:** Missing. AI logic is inline in Node.js services (`LLMService.js`, `DefensivePsyOpsService.ts`).
-   **View:** Mixed. Neo4j and Postgres are written to directly, not purely as read-projections.

## 3. Recommended Fix Sequencing

### Phase 1: Sanitation (Sprint 1)
1.  **Purge Empty Packages**: Delete `packages/*` directories that contain no source code.
2.  **Clarify Frontend**: Rename `client/` to `client-legacy/` or `client-reference/` to avoid confusion with `apps/web`.
3.  **Doc Alignment**: Update `FIRST_PRINCIPLES_REDESIGN.md` to remove references to `IntelGraphService.ts` and point to the actual implementation (`IntelCorroborationService` or `ProvenanceLedgerService`).

### Phase 2: Foundation (Sprint 2-3)
1.  **Enforce Ledger**: Refactor `GlobalIngestor.js` to write *only* to `ProvenanceLedgerService`.
2.  **Implement Sync Worker**: Create the "Background Worker" mentioned in the plan to tail the Ledger and update Neo4j. This solves the "Dual Write" fragility.

### Phase 3: Extraction (Sprint 4+)
1.  **Create `apps/cognitive-engine`**: Initialize the Python/Rust service.
2.  **Move AI Logic**: Migrate `DefensivePsyOpsService.ts` logic to the new engine.
3.  **Retool `psc-runner`**: Update `rust/psc-runner` to actually support graph algorithms or rename it to `psc-enclave`.
