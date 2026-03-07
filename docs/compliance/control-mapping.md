# Control Framework Mapping

This document maps Summit's internal governance and controls to standard external assurance frameworks.

## Methodology

Summit uses a "Control as Code" approach. Controls are defined in `compliance/control-map.yaml` and verified automatically where possible.

## Target Frameworks

1.  **SOC 2 (Security, Availability, Confidentiality)**
    - Focus: Trust Services Criteria (TSC)
    - Status: Primary mapping target.

2.  **ISO 27001 (Information Security)**
    - Focus: ISMS and Annex A controls.
    - Status: Future target.

3.  **AI Governance (NIST AI RMF)**
    - Focus: AI safety and trustworthiness.
    - Status: Partial mapping via Model Cards and Provenance.

## Control Map Summary

| Control ID | Description | Summit Implementation        | Status  |
| :--------- | :---------- | :--------------------------- | :------ |
| **CC1.1**  | Governance  | `AGENTS.md`, Governance Docs | Covered |
| **CC1.2**  | Code Review | PR Templates, CI Gates       | Covered |
| **CC6.1**  | AuthZ       | OPA Policies, Middleware     | Covered |
| **CC7.1**  | Change Mgmt | Velocity Lanes, CI           | Covered |
| **CC8.1**  | Testing     | CI/CD Pipelines              | Covered |

## Gaps & Remediation

- **Gap:** Formal periodic access review automation.
  - _Plan:_ Implement automated access review scripts.
- **Gap:** Disaster Recovery drill evidence automation.
  - _Plan:_ Automate DR drill logs to evidence bucket.

## Machine-Readable Map

The source of truth for this mapping is located at: `compliance/control-map.yaml`.
