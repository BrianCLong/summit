# Antigravity Task: Predictive Risk Posture Engine → Operator Dashboard

## Context
Following the successful stabilization of the Evidence/Lineage Integrity Gate and AIA+FTX foundation, we are advancing to the **Predictive Risk Posture Engine**. This capability demonstrates measurable governance by translating deterministic reasoning traces into actionable intelligence on the Operator Dashboard.

## Objective
Design and implement the UX and API integration for the Predictive Risk Posture Engine on the Operator Dashboard. The focus is on displaying explainable scoring and reasoning traces linked to stable sources.

## Requirements

1. **Explainable Scoring UI:**
   * The dashboard must display a clear, rule-based reasoning trace tied directly to ingested evidence.
   * Eliminate "black-box" UI; auditors must see exact, causal links (Evidence Map) that influence the final risk assessment.

2. **Lineage Visibility:**
   * Integrate the W3C PROV-compliant lineage stamps visually.
   * Provide a "Deterministic Replay" view for high-risk scores, allowing operators to see the exact inputs, transforms, and toolchains.

3. **Governance & Constraints:**
   * The implementation must strictly adhere to the Evidence/Lineage Integrity Gate.
   * Ensure the UI gracefully handles `reliability.json` metrics, specifically highlighting `actionability_rate` and `provable_actionability_index`.
   * **No wall-clock timestamps** should dictate state; rely on W3C PROV deterministic hashes.

## Deliverables
1. React components for the "Predictive Risk Posture" widget in the Operator Dashboard.
2. API integration layer bridging the `scoring` service and the UI.
3. Tests validating the deterministic rendering of reasoning traces.

## Success Criteria
* The UI successfully visualizes complex reasoning traces without token bloat regressions.
* The W3C PROV lineage is accessible and verifiable directly from the UI.
* All changes pass the governance meta-gate and lineage integrity gate.
