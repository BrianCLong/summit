# Next UI Sprint Plan — IG & MC

**Sprint window:** **Mon Sep 15 → Fri Sep 26, 2025**  
**Timezone:** America/Denver (MT)  
**Tracks:** IG = Investigation Graph (analyst workspace) • MC = Management Console (admin & ops)

---

## 1) Goals & Success Criteria

**IG (Investigation Graph)**

- Improve graph discoverability and speed-to-insight (≤ 3 clicks to key entity context; common actions ≤ 2 clicks).
- Ship shareable _Saved Views_ behind a feature flag.
- Reduce p95 graph interaction latency to **≤ 200 ms** and initial render to **≤ 2.0 s** on 5k nodes / 20k edges datasets.

**MC (Management Console)**

- Make RBAC admin safer and faster (role clarity, bulk user ops, audit visibility).
- Deliver _Webhook Config_ with test capability and masked secrets.
- Dark-mode parity for all MC core screens and improve a11y score to **≥ 95** (axe/lighthouse).

**Cross-cutting**

- Adopt Design Tokens v0.7; expand Storybook coverage to **≥ 80%** of UI states for IG+MC.
- Telemetry: standardized event schema and dashboards in place for shipped features.

**Sprint Exit = Success when:** All committed stories meet DoD, pass QA/UAT, flags are ready for gradual enablement, and success metrics dashboards populate with real data.

---

## 2) Timeline & Ceremonies

- **Mon Sep 15** 09:30–10:30 — Sprint Kickoff & scope lock
- **Tue Sep 16** 15:00–16:00 — Design review & handoff (Figma → tickets)
- **Mon Sep 22** 11:00–11:45 — Mid‑sprint demo & risk check
- **Thu Sep 25** 16:00 — Code freeze & release candidate cut
- **Fri Sep 26** 10:00–12:00 — Bug bash • 14:00–15:00 — Review • 15:00–16:00 — Retro

> **Target release**: ship behind flags on RC at end of sprint; progressive enablement the following week.

---

## 3) Team & Capacity (planning)

- **Design**: 1 FTE (Figma, specs, tokens).
- **Frontend**: 3 FTE (IG:2, MC:1). 8 effective days each → ~24 dev‑days.
- **QA**: 1 FTE + embedded FE for bug bash.
- **PM/Lead**: scope, accept, analytics sign‑off.

> **Estimate budget**: ~60–70 story points total (focus on quality/perf).

---

## 4) Scope — IG (Investigation Graph)

### Epics

1. **Graph Usability v2**
2. **Investigation Timeline (MVP)**
3. **Perf & Stability**

### Stories (Ready for Dev)

**IG‑101 — Graph Minimap & Pan/Zoom Controls (flag: `ig_minimap`) — 5 pts**

- **Description:** Add corner minimap with viewport rectangle; mousewheel zoom; ctrl+drag pan; touch pinch.
- **Acceptance Criteria:**
  - Minimap toggles via toolbar; remembers state per user.
  - Zoom 10%–400%; double‑click centers node.
  - Keyboard: `+/-` zoom, arrow keys pan; focus rings visible.
  - Works on datasets up to 5k/20k with ≤ 16 ms/frame during pan.
- **Design:** Figma components for toolbar, minimap, focus outlines.
- **Tech Notes:** Use canvas layer for edges; throttle wheel; requestAnimationFrame for transform.

**IG‑102 — Node Hover Cards — 3 pts**

- **Description:** Lightweight hover to show key fields (type, risk, last_seen, top attributes) with quick actions.
- **AC:** Shows within 150 ms; sticky on `Shift`; escape closes; screen‑reader announces title.

**IG‑103 — Filter Chips Bar + Saved Filters — 5 pts**

- **AC:** Add/remove filters as chips; AND/OR groups; persist per user; sharable via URL params.

**IG‑104 — Bulk Select & Context Actions — 8 pts**

- **AC:** Box‑select, multi‑select via shift; actions: tag, isolate, expand neighbors; undo toast.
- **A11y:** All actions reachable by keyboard; visible focus order.

**IG‑105 — Viewport Performance Pass — 8 pts**

- **AC:** p95 drag/zoom ≤ 200 ms; layout stabilization ≤ 600 ms; memory leak < 5 MB/min under continuous pan.
- **Tech:** Edge virtualization; debounced layout recompute; web‑worker for heavy ops.

**IG‑106 — Saved Views (Create/Rename/Delete/Share) — 5 pts**

- **AC:** CRUD via modal; share read‑only link; optimistic UI; 409 conflict handling; toast results.
- **Analytics:** `ig_saved_view_created`, `ig_saved_view_opened`.

**IG‑107 — Error/Empty States — 2 pts**

- **AC:** Empty graph coach marks; network error inline retry; 500 fallback to lightweight mode.

**IG‑108 — Accessibility & Keyboard Nav — 3 pts**

- **AC:** Tab order documented; roles/aria labels set; axe score ≥ 95; high‑contrast theme verified.

**IG‑109 — Instrumentation — 2 pts**

- **AC:** Emit events for pan/zoom, filter add/remove, bulk actions; schema in `/analytics/ig`.

---

## 5) Scope — MC (Management Console)

### Epics

1. **RBAC Admin v1**
2. **Audit & Config UX**
3. **Global Polish & A11y**

### Stories (Ready for Dev)

**MC‑120 — Role Editor Drawer w/ Permission Matrix — 8 pts (flag: `mc_rbac_editor`)**

- **AC:** Create/edit roles; scoped permissions (read/write/admin) per resource; conflict warnings; unsaved‑changes guard.
- **A11y:** Keyboard navigable grid; SR announces cell context; tooltip descriptions.

**MC‑121 — Users Table: Virtualized + Bulk Actions — 5 pts**

- **AC:** Infinite scroll; select all in filter; bulk add to role, suspend, resend invite; progress feedback.

**MC‑122 — Audit Log Filters & Export — 5 pts**

- **AC:** Filters: date range, actor, resource, action, result; export CSV ≤ 30s with server‑side cursor; empty‑state copy.

**MC‑123 — Webhook Config UI + Test Delivery — 5 pts**

- **AC:** Create/edit endpoint; secret masked with reveal on hold; send test event; last delivery status inline.

**MC‑124 — Org Switcher in Global Header — 3 pts**

- **AC:** Quick switch; remembers last; keyboard accessible; no full reload.

**MC‑125 — Dark Mode Parity — 3 pts**

- **AC:** All primary screens themed via tokens; contrast ≥ 4.5:1; screenshots added to Storybook.

**MC‑126 — Settings Search — 3 pts**

- **AC:** Fuzzy search across setting titles/descriptions; deep links; highlights matches.

**MC‑127 — A11y Pass (Global) — 3 pts**

- **AC:** Axe ≥ 95; forms labeled; error summaries; focus trap in modals.

**MC‑128 — Instrumentation — 2 pts**

- **AC:** `rbac_role_created`, `user_bulk_action`, `audit_filter_applied`, `webhook_test_sent` events emitted.

**MC‑129 — E2E Tests (Playwright) — 3 pts**

- **AC:** Happy‑path for role create/edit, user bulk suspend, webhook test; CI green; screenshots stored.

---

## 6) Cross‑Cutting Work

- **Design Tokens v0.7**: spacing scale, semantic colors (info/success/warn/danger), focus/hover/active; motion durations; exported as CSS vars.
- **Storybook Coverage**: comprehensive states for new components; dark/light; a11y stories.
- **Analytics Standardization**: event naming, required props (user_id, org_id, feature_flag_state), privacy review.

---

## 7) Risks & Mitigations

- **Backend API readiness** (Saved Views, Audit export, Webhook test): _Mitigation_: contract-first stubs, feature flags, graceful fallbacks.
- **Graph performance on large datasets**: _Mitigation_: workerization, virtualization, telemetry thresholds, internal dogfood on large samples.
- **RBAC edge cases** (overlapping roles): _Mitigation_: constraint validation and explicit conflict states.
- **Secrets handling** (webhooks): _Mitigation_: masked by default, role‑gated reveal, redact in logs.

---

## 8) QA & Test Plan

**Functional**

- IG: minimap, selection, filters, saved views, error/empty states.
- MC: role CRUD, users bulk ops, audit filters/export, webhooks test, org switcher.

**Non‑functional**

- **Performance budgets**: IG p95 interactions ≤ 200 ms; MC table scroll jank ≤ 10 dropped frames/10s.
- **Accessibility**: axe/lighthouse ≥ 95; keyboard-only walkthroughs recorded.
- **Security**: XSS on hover cards, CSRF on admin actions, secrets redaction.

**E2E** (Playwright): flows per MC‑129; add smoke for IG saved view open/share.

---

## 9) Definition of Done (DoD)

- Meets AC; code reviewed; unit tests (≥ 70% lines) + E2E where applicable.
- Storybook entries updated; tokens applied; dark-mode verified.
- Analytics events landed & validated; dashboards show traffic in staging.
- A11y checks pass; screenshots added to ticket.
- Feature flags wired; rollback path documented; release notes drafted.

---

## 10) Deliverables

- Shipped (flagged) UI features per stories.
- Updated design tokens and Storybook.
- Telemetry dashboards for IG & MC.
- Sprint review demo deck + retro notes.

---

## 11) JIRA‑Ready Story Templates (copy/paste)

```
[IG‑10x] <Title>
Description:
As an analyst, I want <goal> so that <outcome>.
Acceptance Criteria:
- [ ] <AC 1>
- [ ] <AC 2>
Design:
- Figma: <link>
Tech Notes:
- <implementation details>
Analytics:
- Event(s): <name> { props }
Estimate: <pts>
Flag: <flag_name>
QA Notes:
- Key tests & a11y checks
```

```
[MC‑12x] <Title>
Description:
As an admin, I need <goal> to <outcome>.
Acceptance Criteria:
- [ ] <AC 1>
- [ ] <AC 2>
Design:
- Figma: <link>
Tech Notes:
- <implementation details>
Analytics:
- Event(s): <name> { props }
Estimate: <pts>
Flag: <flag_name>
QA Notes:
- Key tests & a11y checks
```

---

## 12) Ownership & RACI

- **Responsible:** Feature owners per ticket (FE), Designer for specs, QA for validation.
- **Accountable:** UI Lead.
- **Consulted:** Backend leads (Saved Views, Audit, Webhooks), Security, Data.
- **Informed:** PM, Support, Field/CS.

---

## 13) Analytics Event Spec (excerpt)

- `ig_pan_zoom` { user_id, org_id, nodes_visible, edges_visible, fps_avg, flag_state }
- `ig_saved_view_created` { view_id, filters_hash, graph_size }
- `mc_user_bulk_action` { action_type, selection_count, duration_ms }
- `mc_webhook_test_sent` { endpoint_id, response_code, latency_ms }

---

## 14) Prep Checklist (pre‑Mon Sep 15)

- [ ] Backend stubs & contracts aligned (Saved Views, Audit Export, Webhook Test)
- [ ] Figma components named & tokens v0.7 published
- [ ] Storybook scaffolding + CI job green
- [ ] Analytics event names reserved; dashboards created
- [ ] Test datasets prepared (IG: 5k/20k; MC: 50k users)

---

### Appendix A — Story Breakdown by Owner (placeholder)

- Assign IG‑101/105 to FE‑A; IG‑103/106 to FE‑B; MC‑120/123/122 to FE‑C.
- QA pairs TBD at kickoff.

### Appendix B — Release & Rollout

- Flags: `ig_minimap`, `ig_saved_views`, `mc_rbac_editor`.
- Canary: internal orgs (10%) for 48h, then staged rollout.
