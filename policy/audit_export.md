# Audit Export Procedure

To export a submission bundle for audit:

1.  **Identify Evidence ID**: e.g., `EVD-DEFONRAMPS-PROGRAMS-001`.
2.  **Locate Artifacts**: Use `evidence/index.json` to find paths.
3.  **Generate Bundle**:
    *   Collect `report.json`, `metrics.json`, `stamp.json`.
    *   Collect referenced Concept Note.
    *   Collect `policy/data_classification.md` (version at time of submission).
4.  **Package**: Zip contents.
5.  **Hash**: Generate SHA-256 of zip.
6.  **Store**: Archive in approved cold storage.
