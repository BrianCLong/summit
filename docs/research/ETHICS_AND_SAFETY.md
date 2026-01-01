# Research Ethics and Safety Guardrails

## 1. Overarching Directive: First, Do No Harm

All research activities, irrespective of their domain or scope, are governed by the foundational principle of "First, Do No Harm." This applies not only to production systems but to all individuals, data, and the organization's reputation. This document establishes the non-negotiable rules to uphold this directive.

## 2. Ethics & Risk Rules

### 2.1. Data Usage
*   **No Live Data by Default:** The use of live, production, or customer data in any research project is strictly forbidden by default.
*   **Anonymization is Required:** In the rare and exceptional case where production-derived data is deemed essential for a research objective, it must be fully and irreversibly anonymized *before* it enters the research environment.
*   **Data Governance Approval:** The use of any such anonymized data requires a formal proposal and written approval from the Data Governance and Ethics Committee. The proposal must justify the necessity and detail the anonymization techniques used.

### 2.2. Human Impact
*   **No Human Subjects without Review:** Research that involves human subjects, whether directly or indirectly (e.g., analyzing user behavior patterns from anonymized data), is prohibited without a formal review and approval from an Institutional Review Board (IRB) or a similarly constituted ethics committee.
*   **No "Shadow A/B Testing":** Research must never impact live user experiences, even in subtle ways. All experiments must be contained within simulated environments.

### 2.3. Deployment Paths
*   **Zero Deployment Paths:** There must be no technical or procedural path for any research artifact to be deployed to a production or pre-production environment. This is an absolute and unwavering rule, reinforcing the boundary defined in `BOUNDARIES.md`.

## 3. Kill Rules: When Research Must Stop

A line of research inquiry must be immediately terminated under the following conditions.

### 3.1. Automatic Termination Triggers
*   **Ethical Boundary Breach:** Any evidence of a breach of the ethical rules outlined in section 2 of this document.
*   **Violation of Isolation:** Any indication that the research environment is not fully isolated from production systems.
*   **Unforeseen Risk Identification:** The discovery of a new, significant risk (e.g., a potential for misuse of the research) that was not anticipated in the initial research plan.

### 3.2. Authority to Terminate
*   **The Research Lead:** The designated lead for any research project has the primary responsibility to monitor for and enact these kill rules.
*   **The Ethics & Safety Committee:** A standing committee, composed of cross-functional senior leaders, has the authority to review any research project at any time and to issue a binding termination order.
*   **Any Employee (The "Andon Cord" Principle):** Any employee who, in good faith, believes that a research project is violating these safety and ethics rules has the authority and obligation to "pull the Andon Cord," which will immediately halt the research pending a formal review by the Ethics & Safety Committee. There will be no negative repercussions for any employee who invokes this principle in good faith.
