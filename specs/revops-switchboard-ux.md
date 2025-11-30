# Switchboard RevOps Mode UX Blueprint

## Goal
Define the RevOps-focused workspace for Switchboard so revenue, finance, legal, and sales teams get a command-center experience: tri-pane layout, context-aware command palette, and instrumentation hooks that surface policy, evidence, and SLA health for every queue-driven task.

## Workspace & Layout
- **Workspace selector:** "Revenue Operations" option for roles in RevOps/Sales/Finance.
- **Tri-pane shell:**
  - **Left (Queues & filters):** Core queues and shareable saved views with search and attribute filters.
  - **Center (Work list / detail):** Adaptive columns per queue; inline and bulk actions; tap into single-entity detail mode.
  - **Right (Graph / Timeline / Evidence):** Neighborhood graph, chronological timeline, and policy+evidence tabs for the focused entity.
- **Global command palette (⌘K / Ctrl+K):** Exposes routing, approvals, simulations, exports, dashboards, and other verbs; auto-contextualizes to the selected entity.

## Left Pane: Queues & Saved Views
- **Lead queues:** "New MQLs – Unrouted", "Routed – No Touch Yet", "Stuck Leads (SLA Breach)".
- **Deal & quote queues:** "Pending Discount Approvals", "Deals Awaiting Legal", "Deals At Risk (Close Date Passed)".
- **Exception queues:** "Policy Exceptions – Review Needed", "Provisioning Blocks (Contract Issues)", "Data Mismatches (CRM vs Billing)".
- **Saved views:** User-defined, shareable filters across entities/status/attributes (e.g., "My Team’s Approvals Today", "Enterprise Deals > $250k in Europe", "Discounts > 30% – Current Quarter").

## Center Pane: Work Lists & Detail Cards
- **Adaptive work lists:**
  - Leads: name, company, segment, region, owner, SLA remaining, source.
  - Discount approvals: quote name/ID, account, ARR/TCV, discount %, term, segment, status, required approvers.
  - Exceptions: entity type, issue summary, severity, time open.
- **Inline/bulk actions:** Reassign, rerun routing, dismiss low-risk exceptions, Approve/Reject/Reassign/Open-in-CRM, etc.
- **Entity detail for quotes:** Header (account, opportunity, stage, owner), summary (products, ARR/TCV, discount %, effective dates), status & approvals (state, required approvers, decisions), policy rationale (why in queue; triggered rules), activity feed, and actions (approve/reject with rationale, propose changes, request exception, open CRM/CPQ/CLM).

## Right Pane: Graph, Timeline, Policy & Evidence
- **Graph view:** Nodes for Leads/Accounts/Opportunities/Quotes/Contracts/Subscriptions, related users (AE, manager, approvers), systems (CRM/CPQ/billing), PolicyDecision/Approval/Receipt; edges to show routing, approvals, provisioning. Highlights blockers and anomalies (e.g., multiple quotes or missing approvals).
- **Timeline:** Lead creation → routing → first touch; opp/quote creation + updates; policy decisions and approvals; contract sent/viewed/signed; provisioning or activation events. Each item links to receipts/evidence.
- **Policy & evidence tab:** Decision outcome and summary, subject/resource/context attributes, applicable rules, evidence bundle (requests, approvals + rationales, contract versions, system calls) with download/export controls.

## Command Palette (RevOps Verbs)
- Commands: route lead, simulate routing, approve deal, show policy, export evidence bundle, rerun policy check, open dashboards (Pipeline Governance, Revenue Control, Discounts & Win Rates).
- Context-aware defaults: selected quote pre-fills Approve Deal; highlighted lead pre-fills Simulate Routing, etc.

## Approvals Center
- Tabs: My Approvals, Team Approvals (manager view), All Approvals (RevOps/Finance/Legal) with filters.
- Bulk approvals for low-risk items (policy-gated) plus insights: pending approvals by stage/role, average approval time, aging approvals risking slippage.

## Dashboards in RevOps Workspace
- **Pipeline Governance:** Lead routing SLA (% routed within X minutes), first-touch SLA (% contacted within Y hours), routing quality (% reassigned). Charts drill into queues/lists on click.
- **Revenue Control:** Deals with policy exceptions (count/$), missing/late approvals, provisioning blocks, discount bands vs. win rate by segment with drill-through to queues.
- **Exec Snapshot:** Cards for ARR/TCV by segment & discount band, top 10 exception deals this quarter, and a "shadow revenue risk" score tied to exceptions/provisional contracts.

## Policy Simulation (What-If UX)
- Entry points: detail button (Simulate policy with changes…), command palette verbs (Simulate routing/discount approval), and a dedicated Policy Simulation tab.
- Flow: choose scenario (routing/discount approval/contract activation) → prepopulate entity attributes → allow tweaks (country/segment/size for routing; ARR/discount%/term/segment/product mix for discounts) → show allow/deny, required approvals, fired rules, side-by-side vs. current policy. Optionally save simulations as what-if artifacts attached to policy change proposals.

## Role-Based Defaults
- **AE/CSM:** Landing view "My Pipeline & Approvals" with My Leads/Deals/Approvals on the left, lists and simplified details in center, timeline and key policy flags (e.g., discount >25% pending manager approval) on the right.
- **RevOps:** Landing "Pipeline Governance" with routing/SLA queues and config shortcuts on the left, dashboards/config summaries in center, graph/policy preview for rules/workflows on the right.
- **Finance/Legal:** Landing "Revenue Control" with Deals Pending Finance/Legal queues on the left, approval lists & detail views in center, and contract/evidence timelines on the right.

## Instrumentation Hooks
- **Provenance:** Every UI action emits evidence + receipts.
- **Policy visibility:** "Why is this here?" sections driven by actual policy decisions and triggered rules.
- **Observability:** Queue metrics and user interactions flow into approval-latency and SLA compliance SLOs, fueling dashboard stats.
