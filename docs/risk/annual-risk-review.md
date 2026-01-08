# Annual Risk & Resilience Review

**Status:** Draft
**Version:** 1.0
**Owner:** Risk Committee

## Goal

To proactively identify, assess, and mitigate systemic risks (technical, operational, governance) that could threaten the long-term viability or trustworthiness of Summit. This is not a one-time check but a structured annual process.

## Risk Categories

### 1. Technical Risk

- **Dependency Risk:** Reliability of upstream packages, vendor lock-in.
- **Legacy Code:** Accumulation of unmaintainable or "black box" components.
- **Security Debt:** Unpatched vulnerabilities, weak architectural patterns.
- **Scalability limits:** Approaching hard limits of current database or architecture.

### 2. Operational Risk

- **Key Person Risk:** Reliance on specific individuals for critical tasks.
- **Process Fragility:** Manual, error-prone deployment or recovery processes.
- **Incident Response:** Inability to detect or respond to incidents effectively.

### 3. Governance & Compliance Risk

- **Regulatory Change:** New laws (e.g., AI Act) requiring platform changes.
- **License Compliance:** Inadvertent use of incompatible OSS licenses.
- **Data Sovereignty:** Violation of data residency requirements.

## Risk Assessment Process

1.  **Identification:** Brainstorming sessions with engineering, product, and legal.
2.  **Scoring:**
    - **Impact (1-5):** Severity of the consequence (Financial, Reputational, Operational).
    - **Likelihood (1-5):** Probability of occurrence.
    - **Risk Score:** Impact \* Likelihood.
3.  **Mitigation Planning:**
    - **Avoid:** Eliminate the risk source.
    - **Mitigate:** Reduce likelihood or impact (controls).
    - **Transfer:** Insurance or outsourcing.
    - **Accept:** Acknowledge and monitor.
4.  **Simulation:** "Game Days" to test specific failure scenarios.

## Scenario Matrix (Example)

| Scenario ID | Name                | Description                             | Risk Score    | Mitigation Plan                              | Owner     |
| :---------- | :------------------ | :-------------------------------------- | :------------ | :------------------------------------------- | :-------- |
| SC-01       | Region Failure      | Primary cloud region goes dark.         | 20 (High)     | Multi-region failover (Active-Passive).      | SRE       |
| SC-02       | Supply Chain Attack | Malicious code injected via dependency. | 25 (Critical) | SLSA L3 build, dependency pinning, scanning. | SecOps    |
| SC-03       | Lead Dev Departure  | Primary architect leaves abruptly.      | 15 (Med)      | Documentation (ADRs), pair programming.      | Eng Mgr   |
| SC-04       | AI Hallucination    | Agent takes dangerous action.           | 20 (High)     | Human-in-the-loop for high-stakes actions.   | AI Safety |

## Risk Ledger

A live `risk-ledger.yaml` (or Linear issue tracker) is maintained to track the status of identified risks and mitigations.
