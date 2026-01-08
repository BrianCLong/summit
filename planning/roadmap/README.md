# Roadmap Migration & Orchestration Guide

This directory contains the artifacts generated for the "23rd-Order Meta-Orchestration" of the Summit development roadmap.

## 1. Data Sources

- **Jira Backlog**: Imported from `project_management/backlog/jira_issues.json`.
- **Codebase Scanning**: Extracted 800+ TODO/FIXME items from the source code.

## 2. Artifacts

- **`data/MASTER_BACKLOG.json`**: The canonical source of truth for all 900+ issues, normalized to a common schema.
- **`exports/linear_import.csv`**: Formatted for bulk import into Linear.
- **`exports/jira_import.csv`**: Formatted for bulk import into Jira.
- **`docs/TAXONOMY.md`**: Defines the shared schema, priority levels, and statuses for cross-platform alignment.
- **`docs/INITIATIVES_SUMMARY.md`**: High-level overview of the 9 Epics (A-I) for executive/stakeholder review (suitable for NotebookLM).

## 3. How to Execute Migration

### Phase 1: Linear Import

1. Go to Linear Workspace settings -> Import.
2. Select "CSV".
3. Upload `exports/linear_import.csv`.
4. Map columns:
   - `Title` -> Title
   - `Description` -> Description
   - `Priority` -> Priority
   - `Status` -> Status
   - `Labels` -> Labels

### Phase 2: Jira Import

1. Go to Jira Project settings -> External System Import.
2. Select "CSV".
3. Upload `exports/jira_import.csv`.
4. Map columns using the header names provided.

### Phase 3: NotebookLM / AI Context

1. Upload `docs/INITIATIVES_SUMMARY.md` and `docs/TAXONOMY.md` to your Notebook.
2. Use this context to query about roadmap status and strategic alignment.

## 4. Maintenance

To refresh the roadmap from the codebase:

1. Run `npx tsx scripts/roadmap/refresh.ts` (Script to be implemented if continuous sync is needed).
