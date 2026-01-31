Owner: @intelgraph/osint-team
Last-Reviewed: 2026-01-29
Evidence-IDs: none
Status: active
ILSA-Level: 3
IBOM-Verified: true

# OSINT Methodology Atoms

## Collection Mechanics
*   **Stateful Session Tracking:** Collection must record the full session state (headers, cookies, viewports) not just the payload, to prove *how* data was accessed.
*   **Friction & Failure Logging:** "What could not be observed" (e.g., CAPTCHAs, 403s, blocked regions) must be treated as first-class data, not noise.
*   **Temporal Ordering:** The exact sequence of access attempts must be preserved to reconstruct the collector's "journey" for audit.

## Validation & Credibility Mechanics
*   **Claim-Centric Assertions:** Assertions must be decoupled from sources; a source provides raw data, but the *claim* is a distinct entity verified independently.
*   **Evidence Pointers:** Every claim must carry a direct, immutable pointer to the specific raw evidence (Evidence-ID) that supports it.
*   **Time-Versioned Confidence:** Confidence scores are not static; they must be versioned with timestamps to show how trust evolved over time.
*   **Contradiction Linking:** Contradictions are not just low confidence; they are explicit links between opposing claims that must be preserved.

## Automation & Pipeline Design
*   **Contradiction-First Pipeline:** The pipeline must prioritize surfacing conflicts *before* any synthesis or summarization occurs.
*   **No Hidden Collapses:** Builds/Pipelines must fail if contradictions are hidden, collapsed, or averaged out prematurely.
*   **Uncertainty Retention:** Uncertainty must be retained throughout the pipeline and never "cleaned" away for cleaner output.

## Ethics / Explainability / Risk Controls
*   **Explainability Gate:** No analytic output is allowed without a fully traceable path from Collection → Claim → Confidence.
*   **No Opaque Aggregation:** "Black box" aggregation algorithms are prohibited in GA paths; every score change must be explainable.
*   **Inference Creep Detection:** Systems must detect when secondary inferences drift too far from primary evidence (Inference Creep) and flag it.
*   **Automation Authority Bias:** Mitigations must be in place to prevent users from over-trusting automated scores without verifying evidence.
