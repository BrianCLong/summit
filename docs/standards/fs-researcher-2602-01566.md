# FS-Researcher Standards (arXiv:2602.01566)

This document outlines the alignment of Summit's `FS-Workspace Research Mode` with the FS-Researcher paper.

## 1. Dual-Agent Workflow
- **Context Builder**: Responsible for web exploration and building the hierarchical Knowledge Base (KB).
- **Report Writer**: Responsible for composing the report using ONLY the Knowledge Base.

## 2. Persistent Workspace Structure
The workspace is directory-based and contains:
- `index.md`: Main research index.
- `todo.md`: Dynamic task list.
- `log.md`: Iteration logs and results.
- `knowledge_base/`: Markdown notes with statement-level citations.
- `sources/`: Archived raw content from explored sources.
- `artifacts/`: Deterministic machine-verifiable outputs.

## 3. Citation & Evidence Alignment
Every factual claim in the KB must include an `Evidence ID` (e.g., `EVID-XYZ`) that resolves to a file in the `sources/` directory.

## 4. Report Generation Protocol
1. Generate Report Outline.
2. Iterate section-by-section.
3. Apply section-level and report-level checklists.
4. Disable all browsing tools during the Report Writer stage.

## 5. Verifiable Artifacts
- `report.json`: Final report structure and status.
- `metrics.json`: Research performance metrics (citation density, source count, etc.).
- `stamp.json`: Deterministic hash of the workspace (excluding temporal data).
