Owner: @intelgraph/policy-team
Last-Reviewed: 2026-01-27
Evidence-IDs: EVID-OSINT-TURN-004
Status: active

# AI Regulatory Compliance Map

**Scope:** EU AI Act (2026 Enforcement), NIST AI RMF, GDPR, FedRAMP, CMMC 2.0

## Executive Summary
This document maps Summit's governance controls to major AI regulatory frameworks. It serves as the primary "bridge document" for external auditors and internal compliance reviews, specifically addressing the **High-Risk AI obligations effective August 2, 2026**.

## 1. EU AI Act Compliance Strategy
Summit adopts a "Privacy by Design" and "Safety First" approach aligned with Regulation (EU) 2024/1689.

### Classification & Risk Mapping
*   **Core Platform (Narrative Engine):** Classified as **High-Risk AI** (Annex III: Influence on democratic processes / Safety component of critical digital infra) AND **General Purpose AI (GPAI)** with systemic risk.
*   **Copilot Features:** Classified as **Limited Risk** (transparency obligations apply).
*   **Identity/Biometrics:** Summit **DOES NOT** perform real-time remote biometric identification.

### 2026 Compliance Timeline & Implementation
*   **Actionable Planning Horizon:** Most high-risk obligations apply from **August 2, 2026**.
*   **Proposed Amendments:** Monitoring late 2025 "Digital Omnibus" drafts which may delay specific obligations to 2027-2028; however, readiness assumes the August 2026 date remains binding until formal adoption.
*   **Supervision:** Coordination with the European Artificial Intelligence Office for GPAI systemic risk supervision.

### Control Mapping (High-Risk & Systemic Risk)
| EU AI Act Article | Requirement | Summit Control | Artifact |
| :--- | :--- | :--- | :--- |
| **Art 5** | Prohibited Practices | Policy explicit ban on social scoring/manipulation | `compliance/regulatory-lenses.yml` |
| **Art 9** | Risk Management System | Continuous Risk Assessment (Lifecycle) | `compliance/assessments/SUMMIT_RISK_ASSESSMENT_v1.md` |
| **Art 10** | Data Governance | Data Lineage, Bias Mitigation, & Provenance Ledger | `provenance/` (Ledger Service) |
| **Art 11** | Technical Documentation | Automated Documentation Generation | `docs/models/technical_docs/` |
| **Art 12** | Record Keeping | Automatic Event Logging (7+ years) | `artifacts/logs/governance/` |
| **Art 13** | Transparency | Model Cards & System Instructions | `docs/models/` |
| **Art 14** | Human Oversight | "Human-in-the-loop" Review UI | `apps/web/src/components/ReviewQueue.tsx` |
| **Art 15** | Accuracy & Cybersecurity | Red Teaming & Adversarial Testing | `tests/adversarial/` |
| **Art 55** | Systemic Risk (GPAI) | Systemic Risk Assessment & Mitigation | `docs/governance/SYSTEMIC_RISK_EVAL.md` |

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

## 3. Data Sovereignty & Security (FedRAMP & CMMC)

### FedRAMP Modernization (20x)
*   **Authoritative Path:** Summit maintains **FedRAMP Rev5** readiness as the current path for formal authorizations.
*   **Automation Strategy:** Tracking **FedRAMP 20x Phase 2** pilot findings (concluding March 2026). Preparing for shift toward automation-centric evidence and Key Security Indicators (KSIs) for anticipated 20x adoption in late 2026-27.

### CMMC 2.0 Enforcement
*   **Status:** Fully mandatory for DoD contracts as of 2026.
*   **Evidence Standard:** Adherence to **FAQ Revision 2.2**; focusing on verifiable architectural boundaries for CUI/FCI handling. Intent-based claims are replaced by documented, architectural evidence.

## 4. GDPR & Privacy (Modernized 2026)
*   **AI Model Training:** GDPR explicitly applies to AI model training on EU personal data. Summit enforces Lawful Transfer Mechanisms and **Transfer Impact Assessments (TIAs)** for all cross-border training/inference.
*   **Right to Explanation:** Users can query the `Provenance Ledger` to see *why* an AI decision was made.
*   **Data Minimization:** PII masking is enforced at the Gateway layer.
*   **Cross-Border Enforcement:** Preparing for the new EU cross-border enforcement regulation (effective **April 2027**) designed to accelerate multi-jurisdiction cases.

## 5. Evidence Artifacts
The following artifacts are automatically generated during the Release Process:

1.  **AI System Inventory:** JSON list of all models and agents.
2.  **Risk Assessment:** Signed Markdown document (Art 9 Compliance).
3.  **Model Cards:** Standardized disclosures for each model.
4.  **Provenance Log:** Cryptographically verifiable log of AI actions.
5.  **Technical Documentation:** Comprehensive system design docs (Art 11).
