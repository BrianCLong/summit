# Expansion Proposal: Post-Pilot Mandate

## Strategic Goal
Convert the "Security & Governance Beachhead" into a standardized **Decision Assurance Layer** across the organization.

## 1. Immediate Conversion (Month 4-6)
* **Scope:** Full SOC roll-out.
* **Mandate:** "No Containment Action without Summit Validation."
* **Policy Update:**
    * Update *Incident Response Plan* (IRP).
    * Update *Access Control Policy*.
* **Tech:** Integrate Summit API directly into SOAR (Splunk Phantom / Cortex XSOAR) as a blocking gate.

## 2. Horizontal Expansion (Month 6-12)
* **Domain:** **Infrastructure Operations (DevOps/SRE)**.
* **Use Cases:**
    * **Production Access Gating:** "Why do you need SSH to Prod?" -> Verify incident ticket.
    * **Config Change Approval:** "Is this Terraform apply safe?" -> Verify drift check.
* **Value:** Apply the same "Trust & Evidence" model to reliability and uptime.

## 3. Vertical Deepening (Year 1+)
* **Domain:** **Compliance & Audit**.
* **Use Cases:**
    * **Continuous SOC2 Evidence:** Summit logs *are* the evidence.
    * **Automated Auditor Access:** Give auditors read-only access to the Summit Decision Ledger.
* **Value:** Reduce "Audit Tax" to zero.

## Resource Requirements
* **Team:** 1 FTE (Governance Engineer) to manage policy definitions.
* **Infrastructure:** [Details]
* **Budget:** [Details]

## Governance & Approval
* **Sponsor:** [Name]
* **Sign-off Date:** [Date]
