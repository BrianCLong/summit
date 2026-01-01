# GA Golden Run

This document defines the "Golden Run" workflow that validates Summit's core value proposition: **Ingest → Resolve → Analyze → Copilot (cited) → Report/Export (provenanced) → Audit replay**.

## Purpose

To ensure the product is not just a "pile of features" but a cohesive, provable workflow. This workflow is automated in CI via the `ga-gate` check and must pass before any GA release.

## Workflow Description

1.  **Ingest**:
    *   **Input**: `fixtures/ga_golden_run/suspect_transactions.csv` (financial data) and `fixtures/ga_golden_run/threat_intel.stix` (STIX 2.1 JSON).
    *   **Action**: Upload files via the Ingestion Wizard or API endpoint. Map schema fields (CSV headers to ontology).
    *   **Verification**: Entities and relationships are created in the graph. Provenance records are created for the ingestion event.

2.  **Entity Resolution**:
    *   **Action**: Trigger entity resolution.
    *   **Outcome**: The system identifies that "J. Doe" in the CSV and "John Doe" in the STIX file are the same entity based on shared attributes (e.g., email or ID).
    *   **Verification**: A "Resolution Scorecard" is generated explaining the match confidence. A manual reconciliation task is created (or automatically resolved if confidence is high enough).

3.  **Graph Analysis**:
    *   **Action**: Open the Graph Canvas.
    *   **Steps**:
        1.  Search for the resolved "John Doe" entity.
        2.  Expand neighbors (Pivot 1).
        3.  Apply a time filter (Pivot 2) to show only events in 2024.
        4.  Apply a geo filter (Pivot 3) to show only connections in a specific region (e.g., "US").
    *   **Verification**: The graph visual state updates correctly.

4.  **Copilot with Citations**:
    *   **Action**: Ask Copilot: "Summarize the suspicious activity for John Doe."
    *   **Outcome**: Copilot generates a text brief.
    *   **Constraint**: The response **must** include inline citations (e.g., `[1]`) linking back to the specific CSV row or STIX object that provided the evidence.
    *   **Verification**: Verify citations are present and resolve to the correct source material.

5.  **Export Disclosure Bundle**:
    *   **Action**: Export a "Disclosure Bundle" for the investigation.
    *   **Outcome**: A ZIP file containing the report, raw evidence, and a `provenance.json` manifest.
    *   **Verification**: Run `scripts/verify-bundle.ts` to check that the file hashes match the manifest and the transform chain is complete.

    ```bash
    npx tsx scripts/verify-bundle.ts /path/to/downloaded/bundle
    ```

6.  **Audit Replay**:
    *   **Action**: Query the audit log for the session.
    *   **Verification**: Confirm entries exist for: Ingestion, Resolution, Graph Search, Copilot Query, and Export. Confirm entries include WHO (user), WHAT (action), WHY (context), and WHEN (timestamp).

## Acceptance Criteria

*   **Automation**: The entire flow above runs in CI/CD without human intervention.
*   **Determinism**: The output (resolution results, graph structure, citations) is identical across runs.
*   **Performance**:
    *   Ingest E2E time < 30s for the fixture set.
    *   Standard neighborhood query p95 latency < 500ms.
*   **Completeness**: 100% of generated facts have linked provenance.

## Blocking Issues

*   **Pending Implementation**: Real backend metric reporting for the `GADashboard`.
*   **Missing Features**: Automated bundle export verification in E2E test (currently manual/scripted).
