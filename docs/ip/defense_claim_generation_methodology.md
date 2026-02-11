# Defense Claim Generation Methodology (v1.1)

## Master Plan
1.  **ITEM Normalization:** Continue with two consecutive +30 blocks per family (C271-C330, S271-S330).
2.  **Drafting Goals:** Add six continuation-ready clusters:
    *   Rule provenance + explainability.
    *   Credentialed approvals + delegation + revocation.
    *   Adversarial data poisoning defenses.
    *   Cross-model consensus + disagreement handling.
    *   Semantic canarying + harm-minimization.
    *   Disaster recovery + continuity-of-operations.

## Sub-Agent Prompts (A-E)
*   **A) Rule-provenance:** Independent claim on policy rule provenance, explainability, and rule-level audits.
*   **B) Credentialed approvals:** Independent claim on approval credentials, delegation, revocation, and step-up authentication.
*   **C) Poisoning defenses:** Independent claim on poisoning detection, source reliability drift, quarantine, and robustness checks.
*   **D) Cross-model consensus + semantic canarying:** Independent claim on model disagreement handling + semantic canary constraints + safe fallbacks.
*   **E) DR/COOP:** Independent claim on immutable audit backups + recovery proofs + continuity safe modes.

## Convergence Protocol
1.  **Rule-level provenance:** Decisions cite rule IDs/versions and source/author.
2.  **Credentialed approvals:** Approvals are cryptographically bound and revocable.
3.  **Poisoning defense:** Quarantine suspicious inputs; reduce reliance on low-reliability sources.
4.  **Cross-model consensus:** Treat disagreement as uncertainty; prefer monitoring-only.
5.  **Semantic canarying:** Block/constrain actions if semantic safety checks fail.
6.  **DR/COOP:** Preserve audit integrity under outages; fail closed for external publish.

## Bundle Manifest
*   `docs/ip/defense_crm_claims_v1.md`: C271–C330
*   `docs/ip/defense_simulation_apparatus_claims_v1.md`: S271–S330
