# OSINT Ethics & Governance Controls

## OSINT-01: Inference Creep Detection

### Control Description
"Inference Creep" occurs when secondary or tertiary inferences drift too far from the primary evidence, creating a chain of reasoning that is statistically weak but presented as fact.

### Implementation
*   **Maximum Hop Count:** Analytic pipelines must strictly limit the number of inference hops from a raw evidence node.
*   **Confidence Decay:** Each inference hop must apply a decay factor to the confidence score (e.g., 0.9 -> 0.81 -> 0.72).
*   **Flagging:** Claims with >2 hops must be flagged as "Speculative" in the UI.

## OSINT-02: Automation Authority Bias Mitigation

### Control Description
Users tend to over-trust automated scores. System design must actively counteract this bias.

### Implementation
*   **No Naked Scores:** Confidence scores must never be displayed without the top 3 evidence snippets.
*   **Contradiction Warning:** If a claim has a contradiction in the graph, it must be displayed prominently next to the score.
*   **Friction on High-Stakes Actions:** Auto-approval of high-risk actions based solely on OSINT data is prohibited.

## OSINT-03: Mandatory Uncertainty Preservation

### Control Description
Uncertainty is signal, not noise. It must be preserved throughout the pipeline.

### Implementation
*   **Schema Enforcement:** Data models must support probabilistic states (not just True/False).
*   **Aggregation Rules:** Aggregation logic must preserve the *range* of uncertainty (e.g., "Confidence 0.4 - 0.8") rather than collapsing to a mean.
