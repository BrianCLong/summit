# Summit Long-Range Roadmap (Post-GA, Capacity-Aware)

**Purpose:** Translate strategy into a defensible, capacity-aware roadmap that aligns delivery systems
and trust commitments without overpromising. This is a strategy-to-execution translation artifact,
not a delivery plan.

## 0. Confidence & Commitment Encoding (Used Throughout)

| Horizon                | Confidence | Commitment Strength                                       | Evidence Requirement                                        |
| ---------------------- | ---------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| **H1 (0–1 quarter)**   | High       | **Committed** for a limited set; **Planned** for the rest | Shipping evidence + lane capacity + graduation gates        |
| **H2 (2–3 quarters)**  | Medium     | **Planned** with guardrails; selective **Exploratory**    | Prototyped solutions + validated capacity assumptions       |
| **H3 (4–6+ quarters)** | Low        | **Exploratory** only                                      | Research evidence + dependency clarity + policy feasibility |

**Legend per roadmap item:**

- **Commitment:** Committed / Planned / Exploratory
- **Preconditions:** Capacity availability, graduation prerequisites, external dependencies
- **Risk:** Low / Medium / High with primary drivers

## 1. Long-Range Roadmap (Master)

### H1 — Near Term (0–1 quarter)

**A. Product Evolution**

- **GA-adjacent expansions:**
  - Expand case workflow instrumentation for Investigation → Entities → Relationships → Copilot → Results.
    - **Commitment:** Committed
    - **Preconditions:** Graduation lane capacity; telemetry baselines from MVP-3-GA
    - **Risk:** Medium — instrumentation scope creep, cross-team dependency on analytics
- **Graduation candidates:**
  - Copilot-assisted query refinement (limited scope to existing data sources).
    - **Commitment:** Planned
    - **Preconditions:** Policy-as-code gating; audit logging coverage for prompts
    - **Risk:** Medium — policy coverage and model safety reviews
- **De-scoped/sunset:**
  - Pause net-new connector onboarding outside the approved registry path.
    - **Commitment:** Committed
    - **Preconditions:** None (policy enforcement)
    - **Risk:** Low — governance alignment risk only

**B. Platform & Architecture**

- **Structural investments:**
  - Stabilize policy engine interfaces to be the single compliance gate.
    - **Commitment:** Committed
    - **Preconditions:** Policy-as-code conventions finalized; integration test updates
    - **Risk:** Medium — integration touchpoints across services
- **Scalability & reliability:**
  - SLO review for the GA-critical workflow; tighten reliability budgets by lane.
    - **Commitment:** Planned
    - **Preconditions:** SLO telemetry coverage + on-call readiness
    - **Risk:** Medium — instrumentation gaps
- **Tech debt:**
  - Accept legacy client divergences; no cross-boundary refactors this horizon.
    - **Commitment:** Committed
    - **Preconditions:** None
    - **Risk:** Low — explicit debt acceptance

**C. Governance & Compliance**

- **Regulatory mappings:**
  - Map GA controls to current SOC/ISO matrices; document deltas.
    - **Commitment:** Committed
    - **Preconditions:** Compliance evidence index updated
    - **Risk:** Low — documentation scope
- **Control expansions:**
  - Expand immutable audit coverage for Copilot interactions.
    - **Commitment:** Planned
    - **Preconditions:** Policy-as-code enforcement; log schema alignment
    - **Risk:** Medium — log ingestion overhead
- **Audit cadence:**
  - Quarterly evidence package readiness checklist.
    - **Commitment:** Committed
    - **Preconditions:** Compliance owner sign-off
    - **Risk:** Low — process adoption

**D. Delivery System Maturity**

- **Lane evolution:**
  - Formalize GA lane quotas (capacity caps per zone: server/web/docs).
    - **Commitment:** Committed
    - **Preconditions:** Capacity model approval
    - **Risk:** Medium — resourcing variability
- **Graduation pipeline:**
  - Add explicit graduation gate checklists for cross-zone changes.
    - **Commitment:** Planned
    - **Preconditions:** Governance consensus; tooling updates
    - **Risk:** Medium — process friction
- **Tooling upgrades:**
  - CI policy checks for policy-as-code coverage for new regulatory logic.
    - **Commitment:** Planned
    - **Preconditions:** Policy test suite thresholds
    - **Risk:** Medium — false-positive CI failures

**E. Organizational Capacity**

- **Expected throughput:**
  - 2–3 medium initiatives/quarter, constrained to one primary zone per initiative.
    - **Commitment:** Committed (capacity guardrail)
    - **Preconditions:** Stable staffing and incident load
    - **Risk:** Medium — operational incident spikes
- **Constraints:**
  - Graduation lanes at capacity; no “heroic execution.”
    - **Commitment:** Committed
    - **Preconditions:** None
    - **Risk:** Low — guardrail enforcement
- **Enablement assumptions:**
  - Training for policy-as-code authoring and review.
    - **Commitment:** Planned
    - **Preconditions:** Documentation and onboarding materials
    - **Risk:** Low — adoption speed

---

### H2 — Mid Term (2–3 quarters)

**A. Product Evolution**

- **GA-adjacent expansions:**
  - Advanced relationship scoring and explainability within existing graph data.
    - **Commitment:** Planned
    - **Preconditions:** Data quality baseline; explainability acceptance criteria
    - **Risk:** Medium — model explainability requirements
- **Graduation candidates:**
  - Copilot workflow automation for repeatable investigations (human-in-the-loop only).
    - **Commitment:** Planned
    - **Preconditions:** Policy-as-code maturity; audit trail SLAs
    - **Risk:** Medium — human oversight requirements
- **De-scoped/sunset:**
  - Defer experimental UI redesigns not tied to GA workflows.
    - **Commitment:** Planned
    - **Preconditions:** N/A
    - **Risk:** Low — stakeholder expectation management

**B. Platform & Architecture**

- **Structural investments:**
  - Modularize ingestion mesh boundaries to reduce cross-zone coupling.
    - **Commitment:** Planned
    - **Preconditions:** Boundary tests; connector registry stability
    - **Risk:** Medium — migration risk
- **Scalability & reliability:**
  - Capacity-based autoscaling policies tuned for core workloads.
    - **Commitment:** Planned
    - **Preconditions:** Load test evidence; cost guardrails
    - **Risk:** Medium — cost variance
- **Tech debt:**
  - Retire redundant data pipelines with clear deprecation windows.
    - **Commitment:** Planned
    - **Preconditions:** Consumer migration plan
    - **Risk:** Medium — downstream disruptions

**C. Governance & Compliance**

- **Regulatory mappings:**
  - Expand to region-specific compliance overlays (as policy-as-code).
    - **Commitment:** Planned
    - **Preconditions:** Legal review inputs; policy engine compatibility
    - **Risk:** Medium — regulatory changes
- **Control expansions:**
  - Data lineage attestation for ingestion artifacts.
    - **Commitment:** Planned
    - **Preconditions:** Provenance ledger integration
    - **Risk:** Medium — data pipeline instrumentation
- **Audit cadence:**
  - Semiannual external readiness review.
    - **Commitment:** Exploratory
    - **Preconditions:** External auditor availability
    - **Risk:** Medium — scheduling and evidence prep

**D. Delivery System Maturity**

- **Lane evolution:**
  - Dedicated security/compliance lane with explicit WIP limits.
    - **Commitment:** Planned
    - **Preconditions:** Staffing and training
    - **Risk:** Medium — resourcing constraints
- **Graduation pipeline:**
  - Automated graduation readiness scorecard tied to CI.
    - **Commitment:** Planned
    - **Preconditions:** Metrics pipeline reliability
    - **Risk:** Medium — data quality
- **Tooling upgrades:**
  - Policy-as-code test harness expansion (scenario-based).
    - **Commitment:** Planned
    - **Preconditions:** Policy domain model finalized
    - **Risk:** Medium — policy model churn

**E. Organizational Capacity**

- **Expected throughput:**
  - 3–4 initiatives/quarter with guarded scope.
    - **Commitment:** Planned
    - **Preconditions:** Stable staffing and low incident burden
    - **Risk:** Medium — hiring variability
- **Constraints:**
  - Avoid multi-zone features unless explicitly coupled.
    - **Commitment:** Committed
    - **Preconditions:** Governance enforcement
    - **Risk:** Low — adherence risk
- **Enablement assumptions:**
  - Dedicated roadmap operations support for evidence tracking.
    - **Commitment:** Exploratory
    - **Preconditions:** Budget allocation
    - **Risk:** Medium — funding availability

---

### H3 — Long Term (4–6+ quarters)

**A. Product Evolution**

- **GA-adjacent expansions:**
  - Federated analytics across partner ecosystems (opt-in, policy-gated).
    - **Commitment:** Exploratory
    - **Preconditions:** Legal agreements; policy-as-code extensibility
    - **Risk:** High — regulatory and data-sharing risk
- **Graduation candidates:**
  - Autonomous triage suggestions with explainability proofs.
    - **Commitment:** Exploratory
    - **Preconditions:** Proven audit lineage + model governance
    - **Risk:** High — safety and accountability
- **De-scoped/sunset:**
  - Sunset non-compliant legacy workflows after migration windows.
    - **Commitment:** Exploratory
    - **Preconditions:** Adoption + change management readiness
    - **Risk:** Medium — user disruption

**B. Platform & Architecture**

- **Structural investments:**
  - Event-first architecture for all cross-domain changes.
    - **Commitment:** Exploratory
    - **Preconditions:** Provenance ledger scalability
    - **Risk:** High — migration complexity
- **Scalability & reliability:**
  - Multi-region active-active with auditable failover policy.
    - **Commitment:** Exploratory
    - **Preconditions:** Cost and compliance approvals
    - **Risk:** High — operational complexity
- **Tech debt:**
  - Full retirement of legacy client boundary exceptions.
    - **Commitment:** Exploratory
    - **Preconditions:** Modern client parity
    - **Risk:** Medium — adoption pace

**C. Governance & Compliance**

- **Regulatory mappings:**
  - Cross-jurisdiction policy federation with automated attestations.
    - **Commitment:** Exploratory
    - **Preconditions:** Standardized policy schema + legal clearance
    - **Risk:** High — regulatory uncertainty
- **Control expansions:**
  - Real-time compliance drift detection.
    - **Commitment:** Exploratory
    - **Preconditions:** Telemetry maturity and policy coverage
    - **Risk:** High — system complexity
- **Audit cadence:**
  - Continuous audit readiness pipeline.
    - **Commitment:** Exploratory
    - **Preconditions:** Evidence automation maturity
    - **Risk:** High — tooling reliability

**D. Delivery System Maturity**

- **Lane evolution:**
  - Adaptive lane capacity governed by cost and risk signals.
    - **Commitment:** Exploratory
    - **Preconditions:** Mature cost governance tooling
    - **Risk:** High — operational policy disputes
- **Graduation pipeline:**
  - Automated graduation gating with policy-as-code enforcement.
    - **Commitment:** Exploratory
    - **Preconditions:** Proven low false-negative rate
    - **Risk:** High — trust in automation
- **Tooling upgrades:**
  - Autonomous compliance evidence pack generation.
    - **Commitment:** Exploratory
    - **Preconditions:** Evidence data integrity guarantees
    - **Risk:** High — audit acceptance

**E. Organizational Capacity**

- **Expected throughput:**
  - 4–5 initiatives/quarter only if staffing scales and incident load is low.
    - **Commitment:** Exploratory
    - **Preconditions:** Hiring completed; operational maturity
    - **Risk:** High — capacity growth uncertainty
- **Constraints:**
  - Maintain strict lane limits; no systemic coupling across zones without board approval.
    - **Commitment:** Exploratory
    - **Preconditions:** Governance charter update
    - **Risk:** Medium — organizational alignment
- **Enablement assumptions:**
  - Formal roadmap office and board-level governance cadence.
    - **Commitment:** Exploratory
    - **Preconditions:** Executive sponsorship
    - **Risk:** Medium — priority shifts

## 2. Anti-Overpromise Safeguards (Explicit)

- **Not promised:** specific delivery dates, net-new connectors outside the approved registry path,
  and cross-zone refactors that exceed capacity guardrails.
- **Intentionally vague:** long-horizon autonomous features, multi-region active-active, and
  policy federation across jurisdictions.
- **Deliberately deferred:** large-scale UI redesigns not tied to GA workflows, and any effort
  that requires heroic execution or violates lane limits.

## 3. Evidence Alignment (Capacity & SLO Reality)

- **Capacity alignment:** All H1 commitments respect lane limits and one-zone scope. H2/H3 items
  are conditional on stable staffing and low incident load.
- **Graduation reality:** Items that touch Copilot or compliance are gated on policy-as-code and
  audit trail completeness.
- **SLO alignment:** Reliability budgets are a precondition to any throughput increase; no new
  commitments are made without SLO coverage.

## 4. Communication Surfaces (Consistent Views)

### A. Internal Engineering View

- Focus: lane capacity, technical risk, policy-as-code enforcement, reliability budgets.
- H1: deliverable guardrails and graduation gates.
- H2: modularization and automation, scoped by WIP limits.
- H3: exploratory research backlog only.

### B. Product & GTM Leadership View

- Focus: GA-adjacent value and staged expansions with clear guardrails.
- H1: tighten GA workflow outcomes; avoid net-new promises.
- H2: planned expansions with explicit preconditions.
- H3: exploratory narratives only; no commitments.

### C. Compliance / Audit Stakeholders View

- Focus: policy-as-code and evidence readiness over feature velocity.
- H1: mapped controls and audit trail expansion.
- H2: data lineage and readiness reviews.
- H3: continuous audit readiness exploratory track.

### D. Board / Executive Overview

- Focus: credibility, capacity realism, and risk posture.
- H1: committed improvements with known capacity.
- H2: planned investments gated on evidence and staffing.
- H3: optionality and R&D only; no forecasted revenue dependency.

## 5. Roadmap Assumptions Register

| Assumption                                                 | Horizon Impact | Confidence | Review Cadence | Notes                          |
| ---------------------------------------------------------- | -------------- | ---------- | -------------- | ------------------------------ |
| Staffing remains stable with low incident load             | H1/H2          | Medium     | Monthly        | Primary throughput driver      |
| Policy-as-code coverage reaches GA-critical scope          | H1/H2          | Medium     | Bi-weekly      | Required for Copilot evolution |
| Audit evidence automation is accepted by external auditors | H2/H3          | Low        | Quarterly      | May require manual fallback    |
| Budget supports compliance tooling upgrades                | H2             | Medium     | Quarterly      | Dependent on exec approval     |
| Regulatory landscape remains stable                        | H2/H3          | Low        | Quarterly      | Contingency plans required     |

## 6. Roadmap Governance Policy

- **Change authority:** Roadmap updates require approval from Product, Engineering, and Compliance.
- **Change triggers:** capacity shift, incident spikes, regulatory change, or audit findings.
- **Change process:**
  1. Proposal logged with impact on horizons and lane capacity.
  2. Policy-as-code impact assessment completed.
  3. Governance council review and decision log entry.
  4. Communication to all roadmap audiences within 5 business days.
- **Review cadence:** Monthly for H1, quarterly for H2/H3.
- **Auditability:** All changes recorded in governance logs and referenced in compliance evidence.

## 7. Executive Roadmap Memo (Concise)

**Where Summit is going:** We will deepen GA workflow reliability, expand Copilot capabilities only
when policy-as-code and audit evidence support it, and invest in architectural modularity that
keeps delivery scalable.

**How fast we can safely move:** H1 has a small, committed set of improvements aligned to current
capacity. H2 is planned but gated by staffing stability and evidence readiness. H3 is exploratory
only and should not be used for revenue commitments.

**What we are intentionally not committing to:** Net-new connectors outside the registry path,
large-scale UI redesigns unrelated to GA workflows, and multi-region architecture shifts without
clear cost and compliance approvals.

**Why this roadmap is credible:** Every item includes explicit commitment level, prerequisites,
and risk drivers. Capacity guardrails and graduation gates are treated as constraints, not goals.
