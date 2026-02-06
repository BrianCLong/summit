# Standard: Narrative IO Inference & Convergence

**ITEM Slug:** `narrative-io-inference-convergence`
**Focus:** interpretive defaults, structural redundancy, convergence metrics.

## Imports
*   **Corpus Snapshots:** JSON/JSONL files containing document text and metadata.
*   **Metadata:** Timestamps (ISO 8601), Actor IDs (optional), Platform hints.

## Exports
*   **Deterministic JSON Evidence Pack:**
    *   `interpretive_defaults.json`: Extracted presuppositions and implied causality.
    *   `redundancy_clusters.json`: Groups of structurally similar narratives.
    *   `convergence.json`: Metrics on interpretive variance and directional convergence.
    *   `narrative_id_map.json`: Persistent IDs for narratives across time.
    *   `drift_report.json`: Operational drift metrics.

## Non-goals
*   **No Censorship:** This module detects signals; it does not take down content.
*   **No Truth Adjudication:** We track *what* is implied, not whether it is true.
*   **No Demographic Inference:** We do not infer user demographics or target individuals.

## Determinism
*   All outputs must be deterministic given the same input.
*   Use seeded random number generators if sampling is required.
*   Stable sorting for lists in JSON outputs.
