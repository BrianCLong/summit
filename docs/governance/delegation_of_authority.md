Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Delegation of Authority (DoA) & Signature Matrix

## Purpose

To define who has the authority to approve decisions, commit funds, and sign contracts on behalf of the company, ensuring appropriate oversight and risk management without creating unnecessary bottlenecks.

## Principles

1.  **Clarity:** Every employee should know who can approve what.
2.  **Velocity:** Decisions should be made at the lowest responsible level.
3.  **Accountability:** Approvers are accountable for the decisions they sign off on.
4.  **Auditability:** All approvals must be documented and retrievable.

## Signature Matrix

| Category                 | Threshold / Scope    | Required Approver(s)           | Notes                          |
| :----------------------- | :------------------- | :----------------------------- | :----------------------------- |
| **Commercial Contracts** | < $50k / year        | Sales Director                 | Standard terms only            |
|                          | $50k - $250k / year  | VP Sales + Legal Review        |                                |
|                          | > $250k / year       | CRO + CFO + Legal Review       |                                |
|                          | Non-Standard Terms   | Legal Counsel + Relevant Exec  | E.g. Liability caps, Indemnity |
| **Procurement / Opex**   | < $5k                | Manager                        | Within budget                  |
|                          | $5k - $25k           | Director                       | Within budget                  |
|                          | $25k - $100k         | VP                             | Within budget                  |
|                          | > $100k              | CFO                            |                                |
|                          | Unbudgeted Spend     | CFO + CEO                      | Any amount                     |
| **Hiring**               | Backfill / Budgeted  | Hiring Manager + VP            |                                |
|                          | New Headcount        | CFO + CEO                      |                                |
| **Security & Privacy**   | Data Access Grants   | Data Owner + Security Engineer | Least privilege applies        |
|                          | Production Deploy    | Engineering Manager + Security |                                |
|                          | Incident Declaration | Incident Commander             |                                |

## Functional Review Requirements

Before signing, the following functional reviews are mandatory:

- **Legal:** All contracts modifying standard terms, NDAs, DPAs, and disputes.
- **Finance:** All commitments > $10k, all multi-year agreements, revenue recognition deviations.
- **Security:** New software procurement, vendor data access, critical infrastructure changes.
- **Procurement:** Vendor selection for contracts > $50k.

## Escalation Path

If an approver is unavailable:

1.  Designated delegate (must be documented in writing).
2.  Direct manager of the approver (one-up).

## Governance

- This matrix is reviewed quarterly by the CFO and General Counsel.
- Violations of this DoA may result in disciplinary action.

**Last Updated:** Jan 5, 2026
**Owner:** CFO / General Counsel
