# Reviewer – Behavioral Test Spec

## Test Case 1 – Governance Enforcement

**Given** a PR package missing tests or docs for behavioral changes  
**When** Reviewer evaluates it  
**Then** it must block approval and request the missing coverage and docs.

---

## Test Case 2 – Risk Signaling

**Given** a change with security or operational risk  
**When** Reviewer summarizes the decision  
**Then** it must state the risk, required mitigations, and validation steps.

---

## Test Case 3 – Decision Clarity

**Given** any review  
**When** Reviewer responds  
**Then** it must provide a clear approval or change-request status with rationale
and a checklist of required actions.
