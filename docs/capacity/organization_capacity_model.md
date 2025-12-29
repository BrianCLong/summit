# Summit Delivery Capacity & Velocity System

## 1. Purpose and Scope

This document establishes a shared, evidence-driven capacity system for Summit that makes delivery velocity explicit, sustainable, and auditable across all teams and lanes (Experimental, GA-Adjacent, GA). It covers fixed and variable capacity allocations, lane-level WIP limits, cross-team dependency planning, forecasting and commitment rules, and safeguards against burnout and quality erosion.

## 2. Capacity Model

### 2.1 Unit of Capacity — Lane-Slot Week (LSW)

- **Definition:** One lane-slot week equals one engineer’s focused execution slot for one week within a specific lane type (EXP, GA-Adjacent, GA/Graduation, Stability/Incidents, Governance/Review). Each slot assumes ~70% availability after meetings/overhead and excludes PTO/holidays (tracked separately).
- **Why:** Comparable across teams, ties to WIP limits, resistant to gaming (slots are binary: occupied/free), and suitable for forecasting in weekly increments.
- **Accounting:** Each engineer has at most **1 active lane-slot** at a time; partial allocations (0.5) are allowed only for review/governance duties.

### 2.2 Fixed Capacity Reservations (Non-Negotiable)

These are booked **before** any discretionary planning. Percentages apply to total team LSW per sprint unless a higher absolute reservation is needed from historical data.

- **GA Stability & Incident Response:** **15%** minimum (floor) of team LSW; burstable up to 30% with retroactive logging. Includes on-call, hotfixes, SLO work.
- **Contract Maintenance (Frontend + Backend):** **10%** for keeping graduation contracts, SDK surfaces, and API compatibility intact; includes regression fixes.
- **Graduation Pipeline Work:** **10%** dedicated to evidence gathering, audits, runbooks, and risk reviews tied to promotions.
- **Review & Approval Duties:** **10%** for design/code reviews, architecture sign-offs, security/privacy reviews. This capacity is reserved as reviewer half-slots.
- **CI/Operational Drag:** **5%** for test stabilization, flaky tests, build pipeline health.
- **Total fixed reservation:** **50%** LSW default. Teams may raise (never lower) these based on incident/reliability history.

### 2.3 Variable Capacity Allocation (Remaining LSW)

The remaining ~50% LSW is allocated by rule, not negotiation:

- **Lane priority order:** (1) GA Hardening/Follow-ups, (2) GA-Adjacent, (3) Experimental.
- **New Initiatives vs Follow-ups:** At least **40%** of variable capacity must fund follow-ups/finishing work before starting new initiatives within the same lane.
- **Allocation bands per lane (of variable capacity):**
  - **GA Hardening:** 30–50%
  - **GA-Adjacent:** 25–40%
  - **Experimental:** 15–30%
- **Rebalancing rule:** If a lane exhausts its WIP slots, its unused allocation is temporarily reassignable to the next priority lane for that sprint; it reverts in the following sprint.

## 3. Lane-Level WIP Limits

### 3.1 Global Caps

- **Experimental (EXP):** Max **4 concurrent initiatives** org-wide; max **1 per team**.
- **GA-Adjacent:** Max **6 concurrent initiatives** org-wide; max **2 per team**.
- **GA (including Graduation):** Max **8 concurrent initiatives** org-wide; max **2 per team**.

### 3.2 Per-Team Enforcement

- A team may not exceed the lower of the global cap or its lane allocation-derived slots.
- **Start gates:** Work may only start when (a) a free lane-slot exists, (b) dependencies are mapped, and (c) reviewers are pre-booked.
- **Queueing:** Items that exceed WIP limits are placed in a **Ready-but-Blocked queue** with explicit unblock conditions and owner.
- **Escalation:** If a business-critical item is blocked by WIP, the team lead proposes a swap; Director-level approval required to pre-empt existing WIP.

### 3.3 When Limits Are Reached

- **Freeze rule:** No new EXP/GA-Adjacent items may start until at least one completes; GA items require a swap with equivalent or higher business value and a risk review.
- **Capacity spillover:** Teams can donate unused slots to other teams only for the same lane type and only for one sprint at a time with agreed reviewer coverage.

## 4. Cross-Team Dependency Planning

- **Dependency Mapping:** Every initiative maintains a **Dependency Canvas** capturing frontend/backend/API/infra/reviewer/CI needs. Stored with the initiative’s brief and refreshed weekly.
- **Shared Reviewers:** Reviewer half-slots are scheduled during sprint planning; max **5 PRs/week per reviewer**. Critical-path reviews get calendar blocks.
- **Shared CI/Infra Constraints:** Large migrations, schema changes, or heavy CI jobs require a **CI window reservation**; avoid more than **2 concurrent heavy jobs** per hour per pipeline.
- **Contention Identification:** Use a weekly dependency stand-up to flag cross-team blockers; record in the Ready-but-Blocked queue with expected unblock date.
- **Priority Resolution:** When dependencies conflict, preference order is (1) GA stability/incident, (2) graduation commitments, (3) GA-Adjacent, (4) Experimental. Conflicts escalate to the Release Captain.

## 5. Forecasting & Commitment Rules

- **Planning Cadence:** Forecast in LSW per lane per team per sprint. Fixed reservations are applied first; variable capacity is then allocated to queued initiatives respecting WIP.
- **Commitment Tiers:**
  - **Committed:** ≤80% of variable capacity; requires full dependency mapping and reviewer booking.
  - **Stretch:** Next 20% of variable capacity; must be pre-sliced so partial delivery is still valuable.
  - **Aspirational:** Not scheduled; used for visibility only.
- **Graduation Impact:** Graduation evidence and audit tasks consume the dedicated reservation. Promotions that add contract scope must include the corresponding contract maintenance LSW in the following sprint.
- **Replanning Triggers:** Incident bursts using >50% of the Stability reservation, failed dependencies slipping >1 week, or reviewer over-allocation (>5 PRs/week) force a mid-sprint replanning with documented swaps.
- **Evidence & Auditability:** Each initiative tracks planned vs. actual LSW, blocker time, and review wait time. Deviations >20% require a retro note and adjustment to future forecasts.

## 6. Burnout & Quality Safeguards

- **Maximum review load:** **5 PRs/week/person** or **8 hours/week** of review time, whichever hits first.
- **Maximum concurrent lane ownership:** No individual owns more than **2 initiatives** concurrently, across all lanes.
- **Recovery buffers:** After GA promotion or major launch, allocate **1 sprint** with at least **20%** of that team’s variable capacity reserved for defect triage and debt pay-down.
- **Meeting guardrails:** Keep planned work at **≤70%** of theoretical capacity to protect focus and respond to interrupts.

## 7. Velocity & Planning Playbook

1. **Capacity Intake (weekly):**
   - Update team LSW (adjust for PTO/holidays); apply fixed reservations.
   - Confirm reviewer roster and CI window availability.
2. **Backlog Ordering:** Rank by lane priority and readiness (dependency canvas complete, review plan booked, acceptance definition clear).
3. **Slotting:** Fill lane-slots according to WIP caps and allocation bands. Enforce 40% follow-up rule before starting new items in the same lane.
4. **Commitment Setting:** Mark Committed vs Stretch; record explicit exit criteria and expected LSW per initiative.
5. **Execution Controls:** Daily check on WIP adherence; move blocked items to Ready-but-Blocked with owner and unblock condition.
6. **Review Discipline:** Enforce review load caps; auto-rotate reviewers if caps are exceeded.
7. **Change Handling:** Trigger replanning when thresholds in Section 5 hit. Document swaps and rationale.
8. **Retro & Forecast Update:** Capture variance, blocker duration, and review wait time; adjust allocation assumptions for next sprint.

## 8. Leadership Velocity Memo

- **What Summit Can Reliably Deliver:** Work scoped to **Committed capacity (≤80% of variable LSW)** after honoring **50% fixed reservations**. This guarantees stability, contract integrity, graduation evidence, and review coverage without over-reliance on heroics.
- **What Summit Does _Not_ Promise:** Stretch or aspirational items, or any work that would breach WIP limits, reviewer caps, or stability buffers. We do not start initiatives without mapped dependencies and booked reviewers/CI windows.
- **Why This Protects Trust & Quality:** Capacity is planned as infrastructure, not hope. Fixed reservations make stability, contracts, and governance first-class. WIP limits, reviewer caps, and recovery buffers prevent silent risk accumulation and burnout, ensuring promotions and deliveries remain auditable and sustainable.

## 9. Assumptions & Constraints

- PTO/holidays reduce available LSW and must be deducted before applying percentages.
- Multi-lane initiatives split their LSW across lanes; each portion must respect the relevant WIP limit.
- Data used for forecasting (variance, blockers, review wait) is logged per initiative and retained for auditability.

## 10. Governance & Enforcement

- The Release Captain oversees adherence, approves swaps, and enforces freeze rules.
- Compliance with this model is a release gate: initiatives lacking capacity, dependency mapping, or reviewer booking cannot start.
- Quarterly audits compare planned vs. actual LSW and adjust fixed reservations or caps based on reliability and incident trends.
