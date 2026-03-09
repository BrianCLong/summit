# Attribution Governance Specification

**Status:** Draft
**Priority:** P0
**Owner:** Governance Council

## 1. Core Principle
Attribution is a political and legal process, not just a technical output. All attribution claims must be banded by confidence and subject to the "Uncertainty Loop" before public release.

## 2. Confidence Bands

| Band | Technical Certainty | Political Risk | Disclosure Readiness | Action |
|------|---------------------|----------------|----------------------|--------|
| **C1 (Low)** | < 50% | High | Internal Only | Monitoring |
| **C2 (Moderate)** | 50-80% | Moderate | Partner Sharing | Limited Advisory |
| **C3 (High)** | > 80% | Low | Public/Legal | Public Attribution |

## 3. The Uncertainty Loop
Before any attribution moves from C2 to C3, it must pass the Uncertainty Loop:
1.  **Counter-Hypothesis Generation:** AI generates 3 alternative explanations.
2.  **Red Team Review:** Human review of alternative hypotheses.
3.  **Evidence Lock:** Cryptographic signing of the evidence chain.

## 4. Public vs. Private Modes
*   **Private Mode:** Default. All confidence scores visible but raw data restricted.
*   **Public Mode:** Sanitized view. Only C3 attributions displayed with redacted sourcing.
