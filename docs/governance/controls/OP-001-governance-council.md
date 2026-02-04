# Control Spec: OP-001 Cross-Functional Governance Council Oversight

## Control Objective
Establish and maintain a cross-functional Governance Council (Engineering, Legal, Product, Risk) to review systemic risks, approve high-autonomy policies, and oversee compliance posture.

## Threat / Regulatory Driver
*   **Driver:** GRC Strategic Integration (ERP Today)
*   **Regulatory:** NIST AI RMF (GOVERN 1.2), SOC 2 (Control Environment)
*   **Risk:** Siloed decision-making, lack of accountability, misalignment with strategic risk appetite.

## Enforcement Point
*   **Process:** Monthly Governance Council Meeting
*   **Gate:** `GA_LAUNCH_APPROVAL` (Requires Council Sign-off)

## Evidence Artifacts
1.  `council_meeting_minutes` (PDF/Markdown): Record of attendees, decisions, and action items.
2.  `decision_register` (YAML/JSON): Immutable log of strategic governance decisions (e.g., "Approve Policy Bundle v2").

## Pass/Fail Criteria
*   **Pass:**
    *   Council meets at least monthly.
    *   Quorum (representation from all 4 domains) achieved for all strategic decisions.
*   **Fail:**
    *   No meeting evidence for > 45 days.
    *   GA launch attempted without Council approval hash.
