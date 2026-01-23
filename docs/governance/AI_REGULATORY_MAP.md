# AI Regulatory Compliance Map
**Status:** GA Ready
**Last Updated:** 2025-10-27
**Scope:** EU AI Act, NIST AI RMF, GDPR, FedRAMP

## Executive Summary
This document maps Summit's governance controls to major AI regulatory frameworks. It serves as the primary "bridge document" for external auditors and internal compliance reviews.

## 1. EU AI Act Compliance Strategy
Summit adopts a "Privacy by Design" and "Safety First" approach aligned with the EU AI Act (2024).

### Classification
*   **Core Platform (Narrative Engine):** Classified as **General Purpose AI (GPAI)** with systemic risk transparency obligations.
*   **Copilot Features:** Classified as **Limited Risk** (transparency obligations apply).
*   **Identity/Biometrics:** Summit **DOES NOT** perform real-time remote biometric identification.

### Control Mapping
| EU AI Act Article | Requirement | Summit Control | Artifact |
| :--- | :--- | :--- | :--- |
| **Art 5** | Prohibited Practices | Policy explicit ban on social scoring/manipulation | `compliance/regulatory-lenses.yml` |
| **Art 9** | Risk Management System | Continuous Risk Assessment | `compliance/assessments/SUMMIT_RISK_ASSESSMENT_v1.md` |
| **Art 10** | Data Governance | Data Lineage & Provenance Ledger | `provenance/` (Ledger Service) |
| **Art 13** | Transparency | Model Cards & System Instructions | `docs/models/` |
| **Art 14** | Human Oversight | "Human-in-the-loop" Review UI | `apps/web/src/components/ReviewQueue.tsx` |
| **Art 15** | Accuracy & Cybersecurity | Red Teaming & Adversarial Testing | `tests/adversarial/` |

## 2. NIST AI RMF Alignment
We map our workflows to the NIST AI Risk Management Framework functions.

### GOVERN
*   **Culture:** "Governance-First" engineering culture enforced via `AGENTS.md`.
*   **Roles:** Distinct ownership for AI Safety (defined in `docs/governance/OWNERSHIP.md`).

### MAP
*   **Inventory:** Automated AI System Inventory.
    *   *Evidence:* `artifacts/evidence/governance/ai-inventory.json`
*   **Context:** Context mapping in Risk Assessments.

### MEASURE
*   **Metrics:** Automated evaluation of model outputs (hallucination, bias).
    *   *Evidence:* `artifacts/evidence/ci/test-reports/`

### MANAGE
*   **Intervention:** Circuit breakers and rate limits on LLM calls.
*   **Incident Response:** AI specific incident playbooks in `docs/runbooks/`.

## 3. GDPR & Data Sovereignty
*   **Right to Explanation:** Users can query the `Provenance Ledger` to see *why* an AI decision was made.
*   **Data Minimization:** PII masking is enforced at the Gateway layer.
*   **Cross-Border Transfer:** All model inference can be pinned to specific regions via `Litellm` config.

## 4. Evidence Artifacts
The following artifacts are automatically generated during the Release Process:

1.  **AI System Inventory:** JSON list of all models and agents.
2.  **Risk Assessment:** Signed Markdown document.
3.  **Model Cards:** Standardized disclosures for each model.
4.  **Provenance Log:** Cryptographically verifiable log of AI actions.
