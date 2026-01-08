# Portfolio Scorecard & Inventory (Sprint N+55)

**Status:** Draft / Active
**Lead:** Jules
**Date:** 2025-10-27

## Executive Summary

This scorecard inventories active capabilities, experiments, and legacy artifacts to identify candidates for pruning, consolidation, or investment. The goal is to increase value density by removing low-ROI distractions.

---

## 1. Inventory & Scoring

### Legend

- **Value:** 1 (Low) to 5 (High) - Customer adoption/impact.
- **Cost:** 1 (Low) to 5 (High) - Maintenance/Support burden.
- **Risk:** 1 (Low) to 5 (High) - Complexity/Tech Debt.
- **ROI:** Calculated as `(Value * 2) / (Cost + Risk)` (approx).

### A. Core Capabilities (Keep/Invest)

| Item                                  | Owner         | Value | Cost | Risk | ROI     | Notes                                   |
| ------------------------------------- | ------------- | ----- | ---- | ---- | ------- | --------------------------------------- |
| **Core Server** (`server/`)           | Platform      | 5     | 4    | 3    | **1.4** | The main application backend. Critical. |
| **Summit Client** (`apps/web`)        | Product       | 5     | 4    | 3    | **1.4** | The main web interface. Critical.       |
| **IntelGraph MVP** (`intelgraph-mvp`) | Intel         | 4     | 3    | 3    | **1.3** | Core graph capability. Invest.          |
| **Maestro** (`server/src/maestro`)    | Orchestration | 5     | 3    | 4    | **1.4** | Core workflow engine. Invest.           |

### B. Experiments & Incubations (Review)

| Item                                                         | Owner  | Value | Cost | Risk | ROI     | Notes                                                           |
| ------------------------------------------------------------ | ------ | ----- | ---- | ---- | ------- | --------------------------------------------------------------- |
| **Experiments Folder** (`experiments/`)                      | R&D    | 2     | 1    | 2    | **1.3** | Loose collection of scripts. Low cost but low production value. |
| **Smart City Connector** (`integrations/SmartCityConnector`) | IoT    | 1     | 2    | 2    | **0.5** | Demo artifact with simulated logic. Low real value.             |
| **Cognitive Insights** (`cognitive-insights`)                | AI     | 3     | 3    | 4    | **0.8** | Complex, potentially high value but high risk.                  |
| **DeepAgent MVP** (`deepagent-mvp`)                          | AI     | 2     | 2    | 3    | **0.8** | Likely superseded by `server/src/agents`.                       |
| **Summit Cog War** (`summit-cog-war`)                        | PsyOps | 2     | 2    | 2    | **1.0** | Duplicated folder (`summit-cog_war`).                           |

### C. Integrations (Consolidate)

| Item                                                      | Owner    | Value | Cost | Risk | ROI     | Notes                                    |
| --------------------------------------------------------- | -------- | ----- | ---- | ---- | ------- | ---------------------------------------- |
| **GitHub Integration** (`server/src/integrations/github`) | DevOps   | 4     | 2    | 2    | **2.0** | High value for CI/CD. Keep.              |
| **Jira Integration** (`server/src/integrations/jira`)     | DevOps   | 4     | 2    | 2    | **2.0** | High value for tracking. Keep.           |
| **Splunk Integration** (`server/src/integrations/splunk`) | Ops      | 3     | 2    | 2    | **1.5** | Standard logging. Keep.                  |
| **n8n Integration** (`server/src/integrations/n8n.ts`)    | Workflow | 2     | 2    | 3    | **0.8** | Niche usage. Consider checking adoption. |

### D. Legacy & Deprecated (Retire)

| Item                                     | Owner | Value | Cost | Risk | ROI     | Notes                                    |
| ---------------------------------------- | ----- | ----- | ---- | ---- | ------- | ---------------------------------------- |
| **Legacy Client v0.3.9** (`client-v039`) | None  | 0     | 1    | 1    | **0.0** | Dead code. Confusing.                    |
| **Legacy Server v0.3.9** (`server-v039`) | None  | 0     | 1    | 1    | **0.0** | Dead code. Confusing.                    |
| **Root Documentation Sprawl** (`/*.md`)  | All   | 1     | 2    | 1    | **0.6** | High cognitive load. 100+ files in root. |
| **Legacy Folder** (`legacy/`)            | None  | 0     | 1    | 1    | **0.0** | Explicitly legacy.                       |

---

## 2. Recommendations

1.  **Immediate Retirement:** `client-v039`, `server-v039`.
2.  **Consolidation:** Move all root-level non-essential Markdown files to `docs/archive` or specific documentation folders.
3.  **Deprecation:** Mark `SmartCityConnector` as deprecated in favor of a standard ingestion pipeline if one exists, or simply flag it as "Demo Only".
4.  **Deduplication:** Merge/Delete `summit-cog_war` (keep snake_case or kebab-case standard).

## 3. Next Steps

- Execute pruning of v039 folders.
- Apply deprecation warnings to code.
- Re-home root documents.
