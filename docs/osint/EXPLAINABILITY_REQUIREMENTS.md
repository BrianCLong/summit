Owner: @intelgraph/osint-team
Last-Reviewed: 2026-01-29
Evidence-IDs: none
Status: active
ILSA-Level: 3
IBOM-Verified: true

# Explainability Requirements (The Explainability Gate)

## Core Directive
No analytic output is allowed to proceed to General Availability (GA) paths without a fully traceable path from **Collection → Claim → Confidence**.

## Requirements

### 1. Traceable Path
Every derived claim must link back to:
*   **Source Data:** The exact raw collection artifact (HTML, JSON, Image).
*   **Collection Method:** The state of the collector (session ID, headers) at the time of capture.
*   **Transformation Logic:** The code or model version that extracted the claim.

### 2. No Opaque Aggregation
"Black box" scoring algorithms are prohibited.
*   **Bad:** "Confidence Score: 0.85" (No explanation)
*   **Good:** "Confidence Score: 0.85 (Reduced from 0.95 due to source age > 1 year; Supported by 3 corroborating sources)"

### 3. Verification
Automated checks must ensure that `confidenceHistory` and `evidencePointers` are populated for every claim node before it is serialized for downstream consumption.
