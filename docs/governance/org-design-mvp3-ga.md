# Summit Organizational Design for MVP-3-GA Scale

**Purpose:** Define roles, decision rights, incentives, and governance so Summit scales without
breaking trust. This design treats the organization as a control surface for truth preservation,
risk ownership, and governed innovation.

---

## A. Organizational Role & Responsibility Map

### Product & Delivery Roles

#### 1) GA Owner (Truth & Contract Authority)

- **Mandate:** Own GA truth claims, contractual scope, and production readiness.
- **Decision rights:** Final go/no-go for GA promotion, claim language, and GA scope changes.
- **Escalation path:** Escalate risk conflicts to Release Captain; policy conflicts to Governance
  Council; customer conflicts to Executive Sponsor.
- **Does not own:** Delivery sequencing for non-GA lanes; incident response execution.

#### 2) GA-Adjacent Lane Owner

- **Mandate:** Drive improvements tightly coupled to GA guarantees without expanding claims.
- **Decision rights:** Approve GA-adjacent backlog, capacity allocation within lane, risk mitigation
  plans.
- **Escalation path:** Escalate claim ambiguity to Claims & Narrative Guardian; delivery conflicts to
  Release Captain.
- **Does not own:** GA claim language or GA promotion decisions.

#### 3) Experimental Lane Owner

- **Mandate:** Run experiments with explicit hypothesis, guardrails, and rollback plans.
- **Decision rights:** Approve experiments, define success metrics, and stop experiments.
- **Escalation path:** Escalate risk exceptions to Risk Owner; compliance exceptions to Compliance &
  Evidence Steward.
- **Does not own:** Production commitments or external narrative claims.

#### 4) Release Captain / Graduation Chair

- **Mandate:** Operate graduation gates, ensure evidence integrity, and coordinate cross-lane
  dependencies.
- **Decision rights:** Convene graduation reviews, approve readiness artifacts, block release on
  evidence gaps.
- **Escalation path:** Escalate deadlocks to Executive Sponsor; compliance conflicts to Governance
  Council.
- **Does not own:** Product scope or claim language (unless delegated by GA Owner).

### Governance & Risk Roles

#### 5) Risk Owner (by category)

- **Mandate:** Own risk acceptance thresholds (e.g., security, privacy, operational, model risk).
- **Decision rights:** Approve or veto risk acceptance, require mitigations, set risk budgets.
- **Escalation path:** Escalate unmet mitigations to Governance Council; critical risk to Incident
  Commander.
- **Does not own:** Delivery timelines or product prioritization.

#### 6) Compliance & Evidence Steward

- **Mandate:** Ensure evidence integrity, traceability, and policy-as-code compliance.
- **Decision rights:** Block claims or releases lacking evidence; require audit artifacts.
- **Escalation path:** Escalate evidence disputes to Release Captain; compliance gaps to Governance
  Council.
- **Does not own:** Policy content decisions (owned by Policy Engine owners).

#### 7) Claims & Narrative Guardian

- **Mandate:** Protect external claims, marketing language, and press narratives from overreach.
- **Decision rights:** Approve external narrative changes, require evidence alignment.
- **Escalation path:** Escalate conflicts to GA Owner; legal/regulatory conflicts to Governance
  Council.
- **Does not own:** Product roadmap or operational execution.

### Reliability & Operations Roles

#### 8) SLO / Reliability Owner

- **Mandate:** Own SLOs, error budgets, and reliability commitments.
- **Decision rights:** Approve SLO changes, trigger reliability freezes, require rollback if SLOs
  breached.
- **Escalation path:** Escalate sustained SLO breaches to Incident Commander and Release Captain.
- **Does not own:** Feature prioritization outside reliability scope.

#### 9) CI & Tooling Steward

- **Mandate:** Ensure CI integrity, tooling reliability, and developer workflow guardrails.
- **Decision rights:** Gate merges on CI integrity, enforce tooling standards, approve CI changes.
- **Escalation path:** Escalate CI outages to Release Captain; security issues to Risk Owner (security).
- **Does not own:** Product claims or release decisions.

#### 10) Incident Commander (Rotational)

- **Mandate:** Own incident response coordination, communications, and postmortem completion.
- **Decision rights:** Declare incidents, initiate rollback, coordinate comms.
- **Escalation path:** Escalate severity changes to Executive Sponsor; regulatory incidents to
  Compliance & Evidence Steward.
- **Does not own:** Long-term roadmap or claim language.

---

## B. Decision Rights & RACI Mapping

**Core decisions and RACI (Decide/Consult/Informed/Veto):**

| Decision                                     | Decide             | Consult                                          | Informed                         | Veto (conditions)                                                 |
| -------------------------------------------- | ------------------ | ------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------- |
| GA promotion                                 | GA Owner           | Release Captain, Risk Owners, Compliance Steward | Exec Sponsor, Claims Guardian    | Risk Owner (critical risk); Compliance Steward (missing evidence) |
| Rollback (prod)                              | Incident Commander | SLO Owner, GA Owner                              | Release Captain, Claims Guardian | SLO Owner (SLO breach); Risk Owner (security/privacy)             |
| Narrative change (external)                  | Claims Guardian    | GA Owner, Compliance Steward                     | Exec Sponsor                     | Compliance Steward (evidence gap)                                 |
| Spend acceleration (ops)                     | Exec Sponsor       | Risk Owner, SLO Owner                            | GA Owner, Release Captain        | Risk Owner (risk budget exceeded)                                 |
| Lane promotion (experimental -> GA-adjacent) | Release Captain    | GA Owner, Risk Owner, Compliance Steward         | Claims Guardian                  | Compliance Steward (evidence gap); Risk Owner (unmitigated risk)  |
| Policy change (policy-as-code)               | Governance Council | Risk Owner(s), Compliance Steward                | Release Captain                  | Compliance Steward (audit inconsistency)                          |

**Veto rule:** Vetoes require written rationale and a remediation path. Vetoes expire only after
remediation evidence is accepted by the relevant authority.

---

## C. Incentive Alignment Framework

### Rewarded Signals

- **Truth preservation:** Claims align with evidence; discrepancies reduced over time.
- **Risk ownership:** Risks logged, mitigations implemented, acceptance documented.
- **Graduation discipline:** On-time graduation with complete evidence bundles and passing gates.
- **Operational resilience:** Sustained SLO compliance; reduced incident recurrence.

### Neutral Signals

- Raw feature count without validated outcomes.
- Activity volume without evidence quality.

### Penalized Signals

- Overclaiming or narrative drift.
- Bypassing gates or avoiding risk review.
- Shipping without evidence or with missing postmortems.

### Promotion Criteria

- Demonstrated ownership of evidence-based decisions.
- Clear handling of tradeoffs with documented risk acceptance.
- Proven ability to halt releases when evidence is insufficient.

### Bonus/Recognition Mechanisms

- Recognition for preventing incidents via early risk identification.
- Awards for improvements that reduce governance load while preserving truth.
- Bonus multiplier tied to sustained SLO adherence and evidence quality.

---

## D. Governance Operating Model

### Rituals & Cadence

1. **Graduation Review (bi-weekly)**

- **Purpose:** Validate readiness and evidence integrity for promotions.
- **Inputs:** Evidence bundle, risk register updates, SLO status, policy compliance report.
- **Outputs:** Promotion decision, remediation list, updated graduation timeline.

2. **Risk Register Review (weekly)**

- **Purpose:** Validate ownership and mitigation progress.
- **Inputs:** Risk register, mitigation status, incident learnings.
- **Outputs:** Accepted risks, new mitigations, escalations.

3. **Capacity & WIP Review (weekly)**

- **Purpose:** Prevent overcommitment and protect governance capacity.
- **Inputs:** Lane WIP, staffing, SLO burn rate.
- **Outputs:** WIP caps, lane reprioritization, staffing adjustments.

4. **Narrative & Claims Review (weekly)**

- **Purpose:** Ensure external messaging matches evidence.
- **Inputs:** Draft narratives, evidence index, GA claim list.
- **Outputs:** Approved claims, required evidence updates, escalations.

5. **Incident Postmortems (within 5 business days)**

- **Purpose:** Preserve truth, learn, and prevent recurrence.
- **Inputs:** Incident timeline, root cause analysis, impact summary.
- **Outputs:** Action items with owners, updated risk register, updated SLO guidance.

**Decision artifacts:** Evidence bundles, risk acceptance memos, graduation checklists, narrative
approval logs, and postmortem action trackers.

---

## E. Scaling Triggers & Reorg Signals

### Role Expansion Triggers

- **Risk Owner split** when risk register exceeds 25 active items in a category.
- **Second Release Captain** when graduation throughput exceeds 6 promotions/month.
- **Dedicated Evidence Ops** when evidence bundle assembly exceeds 3 days per release.

### Responsibility Split Signals

- **Claims Guardian split** when external narrative changes exceed 4/month.
- **SLO Owner split** when more than 2 distinct SLO classes (e.g., API + model) require separate
  budgets.

### Governance Load Signals

- > 20% of sprint capacity spent on governance remediations.
- Repeated vetoes for the same type of evidence gap.

### Incentive Rebalance Signals

- Increase in unplanned rollbacks or narrative corrections.
- Rising gap between reported progress and evidence completion.

---

## F. Executive Org Design Memo (Concise)

**Summary:** Summit’s organizational design anchors trust by making truth, risk, and governance
explicit owners with authority to stop or slow delivery when evidence is insufficient. Delivery
lanes are separated from governance roles to prevent enthusiasm from overriding proof.

**How the org supports scale:** Clear decision rights and escalation paths allow growth without
heroics. The Release Captain and Risk Owners enforce gates while lane owners drive delivery. This
keeps velocity disciplined and claims grounded in evidence.

**Why incentives reinforce trust:** Promotions and rewards are tied to evidence integrity, risk
ownership, and SLO adherence—not raw output. Narrative changes require evidence alignment.

**Where authority lives under pressure:** Incident Commander controls immediate operational
responses, Risk Owners can veto unsafe progress, and the GA Owner controls external truth claims.
Governance Council resolves conflicts and maintains policy-as-code integrity.

---

## G. Compliance Logging Requirements

All decisions requiring compliance or ethics review must be logged with:

- Decision summary
- Evidence references
- Risk acceptance memo (if applicable)
- Policy-as-code reference

This ensures traceability and prevents silent erosion of governance under pressure.
