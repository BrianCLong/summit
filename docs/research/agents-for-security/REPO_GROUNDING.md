# REPO_GROUNDING.md for Agents-for-Security SOC Copilot

This document outlines the key modules, patterns, and conventions in the Summit repository that will be used to build the SOC Copilot.

## 1. Event Sources

The primary source of events for the SOC Copilot will be the append-only audit log.

*   **Module**: `server/src/audit/appendOnlyAuditStore.ts`
*   **Schema**: `schemas/audit_event_v1.json`
*   **Description**: This is a tamper-evident, append-only log that records security-significant events. It is the ideal source of truth for the SOC Copilot. The events are structured and versioned, which will make them easy to parse and correlate.

## 2. Data Models and Persistence

The `prov-ledger-service` provides a solid foundation for the data models and persistence layer of the SOC Copilot.

*   **Module**: `prov-ledger-service/src/ledger.ts`
*   **Description**: This service already implements concepts like `Evidence`, `Claim`, and `ProvenanceChain`, which are conceptually similar to the `IncidentCandidate`, `Recommendation`, and `Approval` models required for the SOC Copilot. I will adapt these existing models and the in-memory storage pattern for the new service.

## 3. API Layer and Conventions

The existing API layer in the `server` package will be the model for the SOC Copilot's API.

*   **Module**: `server/src/routes/`
*   **Description**: I will create a new set of routes in `server/src/routes/soc.ts` and follow the existing conventions for routing, controllers, and authentication.

## 4. Security and Governance

The existing security and governance documentation provides a framework for how the SOC Copilot should operate.

*   **Module**: `docs/security/`
*   **Description**: The SOC Copilot will be designed to complement the existing security processes, not replace them. The "proposal-only" default and the requirement for human approval align with the principles of the existing security program.
