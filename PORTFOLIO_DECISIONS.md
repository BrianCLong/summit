# Portfolio Decisions (Sprint N+55)

**Decision Date:** 2025-10-27
**Approver:** Jules (Portfolio Lead)

This document records the binding decisions to Keep, Invest, Consolidate, or Retire items from the portfolio inventory.

---

## 1. Retire (Deprecate & Remove)

| Item                     | Decision      | Customer Impact          | Migration Path                  | Timeline                      |
| ------------------------ | ------------- | ------------------------ | ------------------------------- | ----------------------------- |
| **Legacy Client v0.3.9** | **RETIRE**    | None (Internal artifact) | None required.                  | Immediate Move to `.archive/` |
| **Legacy Server v0.3.9** | **RETIRE**    | None (Internal artifact) | None required.                  | Immediate Move to `.archive/` |
| **Legacy Folder**        | **RETIRE**    | None                     | None.                           | Immediate Move to `.archive/` |
| **Smart City Connector** | **DEPRECATE** | Low (Demo users)         | Use generic `IngestionService`. | Warning now, Removal in N+57  |

## 2. Consolidate (Merge & Simplify)

| Item                 | Decision        | Rationale               | Target State                                     |
| -------------------- | --------------- | ----------------------- | ------------------------------------------------ |
| **Root Docs Sprawl** | **CONSOLIDATE** | Reduces cognitive load. | Move to `docs/archive/` or `docs/history/`.      |
| **Summit Cog War**   | **CONSOLIDATE** | Duplicate folders.      | Keep `summit-cog-war`, archive `summit-cog_war`. |

## 3. Invest (Double Down)

| Item                     | Focus Area                   |
| ------------------------ | ---------------------------- |
| **Maestro Orchestrator** | Resilience & Observability.  |
| **IntelGraph MVP**       | Scalability & Multi-tenancy. |
| **Summit Client**        | UX Polish & Performance.     |

## 4. Keep (Maintain)

- Standard Integrations (GitHub, Jira, Splunk).
- Core Server Services.

---

## Execution Plan

1.  **Move Legacy Artifacts**: `client-v039`, `server-v039`, `legacy` -> `.archive/`.
2.  **Code Deprecation**: Add `@deprecated` JSDoc and runtime warning to `SmartCityConnector.ts`.
3.  **Doc Cleanup**: Script to move root markdown files (excluding standard OSS files).
