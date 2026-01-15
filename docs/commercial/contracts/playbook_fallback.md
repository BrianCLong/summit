# Commercial Contract Fallback Playbook ("Fast Lane")

**Goal:** Standardize negotiation positions to close deals faster (≤5 days) without conceding hidden liabilities.

## How to Use This Playbook
*   **Green:** Standard position. Pre-approved.
*   **Yellow:** Fallback position. Sales VP / Legal Counsel approval required.
*   **Red:** Walk-away position. CFO / General Counsel approval required.

---

## 1. Limitation of Liability (LoL)

| Position | Clause Structure | Guidance |
| :--- | :--- | :--- |
| **Standard (Green)** | Cap at 12 months fees paid. | Industry standard. |
| **Fallback (Yellow)** | Cap at 24 months fees paid. | Acceptable for strategic deals >$100k. |
| **Fallback (Yellow)** | Super cap (2x-3x) for Data Breach/IP only. | Common request from Enterprise. |
| **Stop (Red)** | Unlimited liability (except standard exclusions). | Never accept without GC/CEO approval. |
| **Exclusions** | Fraud, Willful Misconduct, Death/PI, IP Infringement. | Standard carve-outs. Do not expand list. |

## 2. Indemnification

| Position | Clause Structure | Guidance |
| :--- | :--- | :--- |
| **Standard (Green)** | IP Infringement (3rd party claims). | We indemnify them if our IP sues them. |
| **Fallback (Yellow)** | Mutual Indemnity for negligence/breach of law. | Acceptable if symmetrical. |
| **Stop (Red)** | Indemnify for "all acts or omissions". | Too broad. Must be tied to negligence/misconduct. |
| **Stop (Red)** | Indemnify for lost profits/consequential damages. | Never. |

## 3. Service Level Agreement (SLA)

| Position | Clause Structure | Guidance |
| :--- | :--- | :--- |
| **Standard (Green)** | 99.9% Uptime (commercially reasonable efforts). | Standard offering. |
| **Credit Cap (Green)** | Max credit 10% of monthly fee. | |
| **Fallback (Yellow)** | 99.95% or 99.99% (requires architectural review). | Only for Premier Tier customers. |
| **Fallback (Yellow)** | Max credit up to 30% of monthly fee. | |
| **Stop (Red)** | Termination right for single SLA breach. | Must be chronic (e.g., 3 consecutive months). |
| **Stop (Red)** | "Penalty" (cash back) instead of Service Credits. | Credits only. |

## 4. Data Processing Addendum (DPA)

| Position | Clause Structure | Guidance |
| :--- | :--- | :--- |
| **Standard (Green)** | Our standard DPA (linked). | Based on SCCs/GDPR/CCPA. |
| **Fallback (Yellow)** | Customer's DPA (if aligned with SCCs). | Requires Privacy Counsel review. Costly delay. |
| **Stop (Red)** | Unlimited liability for data breaches in DPA. | Must be capped (see LoL). |
| **Stop (Red)** | Right to audit physical data centers. | We use AWS/GCP/Azure; we pass through their SOC2. |

## 5. Termination

| Position | Clause Structure | Guidance |
| :--- | :--- | :--- |
| **Standard (Green)** | for Convenience: No (Fixed Term). | Ensuring revenue predictability. |
| **Standard (Green)** | for Cause: 30 days cure period. | |
| **Fallback (Yellow)** | Termination for Convenience with early term fee. | Fee = remaining contract value or 50%. |
| **Stop (Red)** | Termination for Convenience with refund. | No refunds on prepaid annual fees. |

---

## Deal Desk Triage Rubric

| Risk Level | Criteria | Approval Routing | SLA |
| :--- | :--- | :--- | :--- |
| **Green (Fast Lane)** | Standard terms, no redlines, or "Cosmetic" only. | Sales Ops | 24 Hours |
| **Yellow (Review)** | LoL cap increase, Payment terms >Net45, Non-standard DPA. | Legal Counsel + Sales VP | 72 Hours |
| **Red (Executive)** | Unlimited liability, IP ownership changes, Source code escrow. | GC + CFO + CEO | 5 Days |
