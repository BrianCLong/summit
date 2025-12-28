# Summit 12–18 Month Investment Thesis & Capital Plan (MVP-3-GA)

**Purpose:** Provide a defensible 12–18 month investment thesis and capital plan that aligns
strategy, delivery capacity, risk tolerance, and governance constraints into a single, credible
financial narrative.

**Scope:** Capital realism sprint (not fundraising). The plan is built to withstand board,
investor, auditor, and operator scrutiny without overstating delivery capacity or assuming
unearned velocity gains.

---

## A. 12–18 Month Investment Thesis (Master)

### 1) Core value being compounded (12–18 months)

**Primary compounding asset:** **Product trust** through **regulatory defensibility** and
**velocity-with-governance**.

- Trust compounds by consistently shipping GA-adjacent capabilities without violating governance
  constraints or reliability budgets.
- Regulatory defensibility compounds by turning compliance work into reusable, auditable policy
  assets.
- Velocity compounds only when governance, SLOs, and evidence tooling scale in lockstep.

### 2) Why capital (not effort) is the constraint

- **Delivery capacity is bounded by governance throughput**, not raw engineering hours. The
  bottleneck is coordinated review, auditability, and reliability work that must be staffed and
  tooled.
- **SLO and audit readiness are capital-intensive**, requiring platform investment, evidence
  tooling, and specialized reliability/security roles.
- **Sustained velocity without burnout requires organizational resilience**, which is a direct
  function of headcount redundancy and incident buffers.

### 3) Failure modes this plan explicitly avoids

- **Velocity illusions:** Spending to accelerate delivery without scaling governance capacity.
- **Audit debt:** Shipping features that increase compliance exposure without policy-as-code and
  evidence trails.
- **Reliability regression:** Expanding capability surface area without SLO enforcement and
  reliability investment.
- **Hiring outpacing systems:** Adding headcount without clear lane throughput and review
  capacity.

### 4) What Summit is **not** trying to buy with money

- **Not** buying speculative R&D or moonshot scope outside the established narrative.
- **Not** buying short-term topline growth via uncontrolled GTM promises.
- **Not** buying velocity by cutting governance and audit gates.

---

## B. Capital Allocation & Burn Model

### Capital horizon definitions

**12 months (Committed Capital Horizon):**

- High commitment, low elasticity, staffing tied to current governance capacity.
- Baseline funding for GA-adjacent delivery and reliability upgrades.

**18 months (Extended Optionality Horizon):**

- Conditional commitment, higher elasticity, and hiring optionality.
- Triggered only if delivery throughput and reliability metrics hit defined gates.

### Allocation buckets (12-month base plan)

**Assumed 12-month committed capital: $24.0M** (range sensitivity ±10%)

| Bucket                                  | Allocation      | Rationale                                                         | Expected Return                                     | Risk if underfunded                   |
| --------------------------------------- | --------------- | ----------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------- |
| **A. Product & Engineering**            | **38% ($9.1M)** | GA-adjacent delivery, graduation discipline, contract maintenance | Reliable feature delivery aligned with narrative    | Feature slip, graduation backlogs     |
| **B. Platform, Reliability & Security** | **24% ($5.8M)** | SLO enforcement, CI/tooling, operational hardening                | Higher uptime, lower incident cost, faster recovery | SLO breaches, escalations, audit risk |
| **C. Governance & Evidence**            | **14% ($3.4M)** | Compliance mapping, audit preparation, evidence tooling           | Faster compliance cycles, defensible audits         | Audit debt, delayed approvals         |
| **D. GTM Enablement (Constrained)**     | **10% ($2.4M)** | Demo-safe surfaces, narrative enforcement tooling                 | Safe sales enablement without promise debt          | Overpromising, reputational risk      |
| **E. Organizational Resilience**        | **14% ($3.4M)** | Incident buffers, burnout prevention, redundancy                  | Lower attrition, continuity through incidents       | Burnout, single-point failure roles   |

**Burn model assumptions:**

- People costs are the primary driver (≈70–75% of spend).
- Tooling, infrastructure, and compliance fees compose the balance.
- Ramp-up costs include 2–4 months of reduced throughput per net-new role.

### 18-month optionality overlay

**Extended optional capital: +$10.0M** (triggered only if defined gates are met)

- **Capital use:** scale reliability staffing, governance automation, and limited product
  throughput increases.
- **Elasticity:** spend can pause without harming 12-month commitments.
- **Triggers to unlock:**
  - SLO compliance ≥99.9% for 2 consecutive quarters.
  - Governance review SLAs stable or improving.
  - Lane WIP limits respected with no sustained overflow.

### Sensitivity notes

- A **10% increase in incident load** shifts 2–3% from Product to Reliability and Governance.
- A **10% slowdown in delivery throughput** freezes optional hiring and moves GTM spend to
  governance/tooling until throughput recovers.

---

## C. Hiring & Capacity Plan

### Guiding principles

- Hiring ties directly to **lane throughput** and **governance load**.
- No speculative hiring; each role is mapped to delivery bottlenecks or compliance capacity.
- Ramp-up costs baked into 12-month expectations.

### Roles to add (by function)

**Committed 12-month hires (10–12 FTE total):**

1. **Platform Reliability (2–3 FTE)**
   - SLO enforcement, incident response, resilience tooling.
2. **Security & Compliance Engineering (2 FTE)**
   - Policy-as-code coverage, audit evidence automation.
3. **Delivery Engineering (3–4 FTE)**
   - GA-adjacent features, graduation maintenance, technical debt control.
4. **QA / Release Governance (1–2 FTE)**
   - Test automation, release gates, regression control.

**Optional 18-month hires (6–8 FTE total, gated):**

1. **Data & Pipeline Reliability (2 FTE)**
2. **Governance Automation (2 FTE)**
3. **Customer Enablement Engineering (2–4 FTE)**

### Timing assumptions

- **Quarter 1–2:** Fill reliability, security, and QA roles first.
- **Quarter 2–3:** Delivery engineering hires begin; 2–4 month ramp.
- **Quarter 3–4 (optional):** Only hire if SLO and governance triggers are met.

### Roles explicitly **not** being hired yet

- Dedicated growth marketing or speculative GTM expansion roles.
- Large research/ML hiring beyond near-term product commitments.
- Additional platform teams without a defined governance throughput need.

---

## D. Spend Elasticity & Kill Switches

### Fixed vs elastic spend

**Fixed / low-elasticity (must protect):**

- Reliability, security, and compliance coverage.
- Core production infrastructure and SLO tooling.

**Elastic / high-elasticity (first to slow):**

- GTM enablement tooling.
- Non-critical experimentation budgets.
- Optional hiring tied to 18-month horizon.

### Triggers for slowing spend

- Governance review SLAs exceed targets for 2 consecutive cycles.
- Incident rate exceeds reliability budget or SLO breaches occur.
- Delivery throughput falls below lane capacity for 2 consecutive quarters.

### Triggers for accelerating spend

- SLO compliance sustained ≥99.9% for 2 quarters.
- Governance automation reduces review cycle time by ≥20%.
- Graduation pipeline backlog reduced by ≥30%.

### What gets cut first under pressure

1. Optional hiring (18-month horizon)
2. GTM enablement tooling
3. Experimental throughput budget

---

## E. Risk & Downside Modeling

### Top 5 execution risks (12–18 months)

1. **Governance bottleneck risk**: review capacity fails to scale with delivery volume.
2. **Reliability regression**: new surface area reduces SLO compliance.
3. **Audit debt accumulation**: evidence and policy-as-code fall behind.
4. **Burnout and turnover**: insufficient resilience and redundancy.
5. **Roadmap-cadence mismatch**: assumed velocity exceeds system limits.

### Capital-related failure modes

- Overfunding delivery without scaling governance and reliability.
- Underfunding evidence tooling, causing audit delays and credibility loss.
- Hiring before lane capacity can absorb additional throughput.

### Mitigations already in place

- Graduation and governance workflows define safe delivery bounds.
- SLO budgets and incident thresholds gate rollout.
- Evidence capture and policy-as-code requirements reduce compliance ambiguity.

### Downside scenario and survival plan

**Scenario:** Revenue or renewal shortfall forces a 20% capital reduction after month 6.

**Survival plan:**

- Freeze all optional hires and GTM spend.
- Maintain reliability, security, and governance roles.
- Reduce experimental throughput to protect GA commitments.
- Extend runway by 4–6 months while preserving audit readiness.

---

## F. Alignment with Roadmap & Velocity

- 12-month plan maps to H1/H2 roadmap horizons without assuming new velocity.
- 18-month optionality requires system changes (governance automation, reliability maturity).
- Lane WIP limits are respected; hiring is phased to avoid review bottlenecks.
- Reliability budgets and SLOs are treated as non-negotiable gates.

---

## G. Board-Ready Capital Memo

**Subject:** Summit 12–18 Month Investment Thesis & Capital Plan (MVP-3-GA)

**Capital required:**

- **12-month committed:** **$24.0M** (±10% sensitivity)
- **18-month optional:** **+$10.0M** (triggered by SLO + governance gates)

**What it buys:**

- Sustained GA-adjacent delivery with governance and audit readiness intact.
- Reliability and security posture consistent with SLO commitments.
- A defensible compliance story that scales with product breadth.

**What it does not buy:**

- Unbounded growth or speculative R&D outside defined narrative.
- Speed beyond governance capacity.

**Remaining risks:**

- Governance throughput may lag delivery velocity if automation lags.
- Incident pressure could reallocate capital away from feature delivery.
- Hiring ramp-up may temporarily reduce throughput.

**Why this plan is disciplined and credible:**

- It protects reliability and governance as first-order constraints.
- It separates committed capital from optionality.
- It embeds explicit triggers and kill switches to prevent overreach.

---

## H. Decision Log (Compliance)

- This plan assumes all regulatory and compliance requirements are implemented as policy-as-code.
- Any new compliance obligations will be routed through governance for codification and evidence
  capture before delivery commitments expand.
