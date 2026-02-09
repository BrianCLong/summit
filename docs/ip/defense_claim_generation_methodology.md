# Defense Claim Generation Methodology

This document outlines the systematic approach used to generate and expand Intellectual Property (IP) claims for the Summit/IntelGraph defense families (CRM and Simulation Apparatus).

## 1. Master Plan Rationale
The "next and more" ITEM normalization strategy aims to accelerate the growth of our defensive moats by adding two consecutive +30 claim blocks (+60 new dependents total) per family in each expansion turn.

### Drafting Goals
The current expansion turn (C271–C330 and S271–S330) focuses on six continuation-ready moat clusters:
1. **Policy rule provenance + per-rule explainability**: Ensuring every governance decision is traceable to its source and author.
2. **Credentialed approvals + delegation + revocation**: Cryptographically binding human approvals to defense actions.
3. **Adversarial data poisoning defenses**: Protecting narrative state integrity against malicious input shifts.
4. **Cross-model consensus + disagreement handling**: Using variance among models as a proxy for uncertainty and risk.
5. **Semantic canarying + harm-minimization constraints**: Rolling out defense actions safely using constrained variants.
6. **Disaster recovery + continuity-of-operations**: Ensuring audit integrity and accountability even during outages.

## 2. Expansion Vectors (Sub-Agent Prompts)
We use a sub-agent architecture to specialize the drafting process across different defensive domains:

### Prompt A: Rule-provenance continuation pack
*   **Vector:** Independent claims on policy rule provenance, explainability, and rule-level audits.
*   **Focus:** Mapping decisions to specific rule IDs, versions, and authors.

### Prompt B: Credentialed approvals continuation pack
*   **Vector:** Claims on approval credentials, delegation, revocation, and step-up authentication.
*   **Focus:** Multi-factor and dual-control requirements for high-risk actions.

### Prompt C: Poisoning defenses continuation pack
*   **Vector:** Claims on poisoning detection, source reliability drift, quarantine, and robustness checks.
*   **Focus:** Identifying anomalous shifts in input data distributions.

### Prompt D: Cross-model consensus + semantic canarying continuation pack
*   **Vector:** Claims on model disagreement handling + semantic canary constraints + safe fallbacks.
*   **Focus:** Routing high-variance cases to monitoring-only or red-team review.

### Prompt E: DR/COOP continuation pack
*   **Vector:** Claims on immutable audit backups + recovery proofs + continuity safe modes.
*   **Focus:** Preserving the chain of custody and fail-closed logic for governance availability.

## 3. Moat Cluster Mapping
The moat clusters map directly to the platform's defensive capabilities as follows:
*   **Provenance Clusters:** Build trust through transparency and accountability.
*   **Approval Clusters:** Build safety through cryptographically verified human-in-the-loop.
*   **Integrity Clusters (Poisoning/Consensus):** Build robustness through adversarial-aware data and model fusion.
*   **Canary Clusters:** Build resilience through safe, incremental deployment.
*   **Availability Clusters (DR/COOP):** Build continuity through immutable, distributed audit state.

## 4. Convergence Protocol
The following protocol ensures all generated claims converge on a unified defensive posture:
1.  **Rule-level provenance:** Citations for every decision.
2.  **Credentialed approvals:** Cryptographic signatures for every high-risk action.
3.  **Poisoning defense:** Automatic quarantine of suspicious content.
4.  **Cross-model consensus:** Disagreement implies uncertainty; prefer monitoring.
5.  **Semantic canarying:** Constrain actions if safety checks fail.
6.  **DR/COOP:** Audit integrity as a blocker for external publishing.
