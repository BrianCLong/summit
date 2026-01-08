# Valuation Inputs: Cost, Risk, and Time-to-Value

**Objective**: Engineering informs deal decisions with hard data.

We do not trust "synergy" buzzwords. We value based on "Integration Reality."

## 1. Estimation Variables

For each candidate, Engineering must provide the following estimates to the Deal Team:

### A. Integration Cost (IC)

- **One-Time Costs**:
  - Refactoring / Re-platforming (Person-Weeks).
  - Security remediation (Pen-test fixes).
  - Data migration tooling.
- **Ongoing Costs**:
  - Cloud infrastructure delta.
  - Third-party licensing renewal.
  - Maintenance headcount (DevOps/SRE).

### B. Reliability & Security Risk Delta (R_delta)

- **Reliability Risk**: probability of the integration causing a Summit outage.
- **Security Risk**: probability of the integration introducing a vulnerability.
- **Calculation**: `Score(Candidate) - Score(Summit Baseline)`. A positive delta reduces valuation.

### C. Time-to-Value (TTV)

- **TTV_min**: Time to "Hello World" integration (e.g., SSO + iframe).
- **TTV_core**: Time to full data/workflow interoperability.
- **TTV_mature**: Time to full compliance and operational alignment.

## 2. The Recommendation Matrix

Based on the variables, Engineering issues one of three recommendations:

| Recommendation  | Criteria                             | Action                                                    |
| :-------------- | :----------------------------------- | :-------------------------------------------------------- |
| **🟢 GO**       | Low Risk, High Value, TTV < 30 days. | Proceed to Integration Planning.                          |
| **🟡 GO (FIX)** | Fixable Gaps, Value > Cost of Fix.   | Price the fix into the deal. Require "fix-first" roadmap. |
| **🔴 WALK**     | Red Flags present, or Cost > Value.  | Terminate DD. Document reasons.                           |

## 3. FinOps & SLO Impact

- **FinOps**: Integration must not degrade Summit's unit economics (Cost per Tenant). If candidate is inefficient, re-platforming cost must be included.
- **SLO Impact**: If candidate's p95 latency > Summit's SLO (1500ms), it cannot sit on the critical path until fixed.
