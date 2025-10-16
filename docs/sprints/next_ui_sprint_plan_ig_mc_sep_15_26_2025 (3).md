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

---

## 15) Execution Plan & Assignments (Next Step)

**WIP limits:** IG=2 concurrent stories, MC=2; each story ships with analytics + a11y + Storybook before code freeze.

**Owners (placeholders — adjust at kickoff):**

- **FE‑A** → IG‑101, IG‑105, IG‑108, IG‑109
- **FE‑B** → IG‑102, IG‑103, IG‑106, IG‑107
- **FE‑C** → MC‑120, MC‑121, MC‑122, MC‑123, MC‑124, MC‑125, MC‑126, MC‑127, MC‑128, MC‑129
- **Design** → All stories’ specs, tokens v0.7, dark‑mode audits
- **QA** → Functional, non‑functional, E2E; bug bash coordination

### Subtask blueprint (apply to each story)

- [ ] Design sign‑off & redlines
- [ ] API contract verified (stub or live)
- [ ] Implementation
- [ ] Unit tests (≥70%)
- [ ] Storybook states (light/dark, error/empty)
- [ ] A11y checks (axe/lighthouse ≥95)
- [ ] Analytics events emitted & validated
- [ ] Docs & release notes snippet
- [ ] E2E (where applicable)
- [ ] Flag wiring & guardrails

---

## 16) Dependency Map

- **IG‑106 Saved Views** ⇢ depends on **IG‑103** (filters URL model) & **Saved Views API** (backend). Fallback: local-only persistence when API unavailable.
- **IG‑105 Perf Pass** ⇢ informs **IG‑101/102/104** interactions; run perf tuning before code freeze.
- **MC‑120 Role Editor** ⇢ requires **Design Tokens v0.7** and **RBAC schema** finalized.
- **MC‑123 Webhooks** ⇢ requires **Test Event API**; secrets storage/rotation confirmed.
- **MC‑122 Audit Export** ⇢ server cursor pagination tested with ≥10M events fixture.

---

## 17) Day‑by‑Day Plan (Sep 15–26, 2025)

**Week 1**

- **Mon 15**: Kickoff; finalize scope; align API contracts; FE spins scaffolds; Design tokens drop.
- **Tue 16**: Design handoff; start IG‑101/103 & MC‑120/121; create analytics schemas.
- **Wed 17**: IG‑102/104 in dev; MC‑123/124 start; Storybook base wired.
- **Thu 18**: Internal design QA; first a11y passes; start perf telemetry hooks (IG‑109, MC‑128).
- **Fri 19**: Internal demo #1; address feedback; stabilize filters and role editor grid.

**Week 2**

- **Mon 22**: Mid‑sprint demo; begin IG‑105 perf pass; MC‑122/125 kick; draft release notes.
- **Tue 23**: IG‑106 saved views CRUD; MC‑126 settings search; bug triage.
- **Wed 24**: A11y/global polish (IG‑108, MC‑127); E2E scaffolding (MC‑129).
- **Thu 25**: **Code freeze 16:00**; cut RC; execute E2E + regression; perf runs.
- **Fri 26**: Bug bash AM; sign‑off, review, retro PM.

---

## 18) JIRA CSV (Import‑Ready)

> Columns: Issue Type,Summary,Description,Epic Link,Story Points,Labels,Components,Assignee,Priority,Sprint,Fix Version,Flag

```
Story,IG‑101: Graph Minimap & Pan/Zoom,"Add minimap + zoom/pan with a11y controls.",Graph Usability v2,5,ig,IG,FE‑A,High,Sprint Sep15,2025.9,ig_minimap
Story,IG‑102: Node Hover Cards,"Key fields hover with quick actions.",Graph Usability v2,3,ig,IG,FE‑B,Medium,Sprint Sep15,2025.9,
Story,IG‑103: Filter Chips & Saved Filters,"Chips bar, AND/OR groups, url‑share.",Graph Usability v2,5,ig,IG,FE‑B,High,Sprint Sep15,2025.9,
Story,IG‑104: Bulk Select & Context Actions,"Box/multi‑select + tag/isolate/expand.",Graph Usability v2,8,ig,IG,FE‑A,High,Sprint Sep15,2025.9,
Story,IG‑105: Viewport Performance Pass,"Virtualize edges; p95 ≤ 200ms.",Perf & Stability,8,ig,IG,FE‑A,High,Sprint Sep15,2025.9,
Story,IG‑106: Saved Views CRUD/Share,"Create/rename/delete/share views.",Graph Usability v2,5,ig,IG,FE‑B,High,Sprint Sep15,2025.9,ig_saved_views
Story,IG‑107: Error/Empty States,"Coach marks; retries; fallback.",Perf & Stability,2,ig,IG,FE‑B,Medium,Sprint Sep15,2025.9,
Story,IG‑108: Accessibility & Keyboard Nav,"Tab order + roles/aria; axe ≥95.",Graph Usability v2,3,ig,IG,FE‑A,High,Sprint Sep15,2025.9,
Story,IG‑109: IG Instrumentation,"Emit pan/zoom/filter events.",Perf & Stability,2,ig,IG,FE‑A,Medium,Sprint Sep15,2025.9,
Story,MC‑120: Role Editor Drawer,"Permission matrix; conflict warnings.",RBAC Admin v1,8,mc,MC,FE‑C,High,Sprint Sep15,2025.9,mc_rbac_editor
Story,MC‑121: Users Table Virtualized + Bulk,"Infinite scroll; bulk actions.",RBAC Admin v1,5,mc,MC,FE‑C,High,Sprint Sep15,2025.9,
Story,MC‑122: Audit Filters & Export,"Filterable audit; CSV export.",Audit & Config UX,5,mc,MC,FE‑C,High,Sprint Sep15,2025.9,
Story,MC‑123: Webhook Config + Test,"Create/edit endpoint; test delivery.",Audit & Config UX,5,mc,MC,FE‑C,High,Sprint Sep15,2025.9,
Story,MC‑124: Org Switcher,"Quick org switch; no full reload.",Global Polish & A11y,3,mc,MC,FE‑C,Medium,Sprint Sep15,2025.9,
Story,MC‑125: Dark Mode Parity,"Tokens applied; contrast ≥4.5:1.",Global Polish & A11y,3,mc,MC,FE‑C,Medium,Sprint Sep15,2025.9,
Story,MC‑126: Settings Search,"Fuzzy search w/ deep links.",Global Polish & A11y,3,mc,MC,FE‑C,Medium,Sprint Sep15,2025.9,
Story,MC‑127: A11y Pass (Global),"Axe ≥95; labeled forms; focus traps.",Global Polish & A11y,3,mc,MC,FE‑C,High,Sprint Sep15,2025.9,
Story,MC‑128: MC Instrumentation,"RBAC/user bulk/webhook events.",Audit & Config UX,2,mc,MC,FE‑C,Medium,Sprint Sep15,2025.9,
Story,MC‑129: E2E Tests (Playwright),"Happy‑path for RBAC, bulk suspend, webhook test.",Audit & Config UX,3,mc,MC,FE‑C,High,Sprint Sep15,2025.9,
```

---

## 19) Test Data & Environments

- **IG fixtures:** `graph-5k-20k.json`, `graph-1k-4k.json`; properties include risk score distribution, last_seen timestamps, entity types (user, host, ip, proc, alert).
- **MC fixtures:** `users-50k.csv` with varied roles/status; `audit-10M.parquet` for export; `webhook-endpoints.json` with valid/invalid URLs.
- **Env toggles:** `ig_minimap`, `ig_saved_views`, `mc_rbac_editor` default=off in prod; on in staging.

---

## 20) QA Matrix (excerpt)

| Area   | Test               | Steps                                 | Pass Criteria                                   |
| ------ | ------------------ | ------------------------------------- | ----------------------------------------------- |
| IG‑101 | Zoom/pan a11y      | Keyboard `+/-`, arrows, focus ring    | SR announces control; no hidden traps           |
| IG‑103 | Filter persistence | Add AND/OR groups; reload; share URL  | Filters restored; shared link opens same state  |
| IG‑105 | Perf budget        | 60s continuous pan/zoom on 5k/20k     | p95 ≤200ms; mem leak <5MB/min                   |
| MC‑120 | Conflict states    | Create overlapping permissions        | Warning shown; cannot save invalid config       |
| MC‑123 | Test delivery      | Send test to mocked 200/500 endpoints | Status + latency displayed; secret never logged |

---

## 21) Analytics Tracking Plan (payload examples)

- `ig_pan_zoom` → `{ user_id, org_id, nodes_visible:int, edges_visible:int, fps_avg:float, zoom_level:int, flag_state:string }`
- `ig_saved_view_created` → `{ view_id, filters_hash, graph_size:int, duration_ms:int }`
- `mc_user_bulk_action` → `{ action_type:"suspend|invite|assign_role", selection_count:int, duration_ms:int, success:bool }`
- `mc_webhook_test_sent` → `{ endpoint_id, response_code:int, latency_ms:int, error?:string }`

Dashboards: IG Interaction (fps, zoom distribution); Saved Views adoption; MC Admin throughput; Webhook reliability.

---

## 22) Release Candidate (RC) Go/No‑Go Checklist

- [ ] All stories merged behind flags; no P0/P1 open
- [ ] Perf budgets met (IG/MC)
- [ ] A11y ≥ 95 across target pages
- [ ] E2E green in CI; screenshots stored
- [ ] Release notes drafted; support/CS briefed
- [ ] Rollback plan validated; flags default off in prod

---

## 23) Release Notes Draft (customer‑facing, flagged)

- **Investigation Graph (beta):** Minimap & smoother zoom/pan, new filter chips, bulk actions, _Saved Views_ (invite‑only).
- **Management Console:** New Role Editor, faster Users table with bulk actions, richer Audit filtering/export, Webhook setup with one‑click test, Org switcher, and full dark‑mode.
- **Accessibility:** Widespread improvements; keyboard navigation everywhere.
- **Performance:** Large‑graph interactions now markedly smoother; admin tables virtualized.

---

## 24) Comms & Enablement

- Internal changelog in #release‑ui; demo gifs; 5‑min enablement deck for CS/Support.
- Canary to internal orgs (10%) for 48h; expand to 50%, then 100% pending telemetry health.

---

## 25) Design Tokens v0.7 — Working Spec (extract)

```json
{
  "color": {
    "bg": { "base": "#0B0C0F", "surface": "#111318", "elevated": "#161921" },
    "fg": { "primary": "#E6EAF2", "muted": "#A7B0C0", "inverse": "#0B0C0F" },
    "semantic": {
      "info": "#2F7EEA",
      "success": "#2FB170",
      "warning": "#D6A533",
      "danger": "#E25241"
    },
    "border": { "subtle": "#222633", "strong": "#2E3445", "focus": "#2F7EEA" }
  },
  "space": {
    "xs": 4,
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 24,
    "2xl": 32,
    "3xl": 48
  },
  "radius": { "sm": 6, "md": 10, "lg": 16, "xl": 20, "2xl": 24 },
  "shadow": {
    "sm": "0 1px 2px rgba(0,0,0,.2)",
    "md": "0 4px 12px rgba(0,0,0,.25)",
    "lg": "0 12px 28px rgba(0,0,0,.3)"
  },
  "motion": { "fast": 120, "base": 180, "slow": 260 },
  "focusRing": { "width": 2, "offset": 2 }
}
```

**Notes:** Export as CSS variables (`:root[data-theme]`) and JS tokens. Dark/light mapped via theme switch; WCAG contrast checked.

---

## 26) Component Inventory & Storybook Matrix

**IG**: `Minimap`, `GraphToolbar`, `HoverCard`, `FilterChipsBar`, `SavedViewModal`, `BulkActionBar`, `Toast`, `CoachMarks`.
**MC**: `RoleEditorDrawer`, `PermissionMatrixGrid`, `UsersTable(Virtualized)`, `AuditFilterBar`, `AuditExportDialog`, `WebhookForm`, `OrgSwitcher`, `SettingsSearchInput`.

**States to cover in Storybook (each component):** default • loading • empty • error • a11y-focus • dark • high-contrast • RTL • disabled.

---

## 27) API Contracts (extract — OpenAPI flavored)

```yaml
paths:
  /api/ig/saved-views:
    get:
      {
        summary: List views,
        parameters: [{ name: q, in: query, schema: { type: string } }],
      }
    post:
      {
        summary: Create view,
        requestBody:
          {
            content:
              {
                application/json:
                  { schema: { $ref: '#/components/schemas/SavedView' } },
              },
          },
      }
  /api/ig/saved-views/{id}:
    patch: { summary: Update view }
    delete: { summary: Delete view }
  /api/audit/exports:
    post:
      {
        summary: Start export,
        responses:
          {
            '202':
              {
                description: Accepted,
                headers: { Location: { schema: { type: string } } },
              },
          },
      }
  /api/webhooks/test:
    post:
      {
        summary: Send test event,
        responses:
          {
            '200':
              {
                description: Result,
                content:
                  {
                    application/json:
                      {
                        schema:
                          { $ref: '#/components/schemas/WebhookTestResult' },
                      },
                  },
              },
          },
      }
components:
  schemas:
    SavedView:
      {
        type: object,
        required: [name, filters],
        properties:
          {
            id: { type: string },
            name: { type: string },
            filters: { type: object },
            owner: { type: string },
          },
      }
    WebhookTestResult:
      {
        type: object,
        properties:
          {
            responseCode: { type: integer },
            latencyMs: { type: integer },
            bodyPreview: { type: string },
          },
      }
```

---

## 28) URL Model & Routing (IG Filters & Saved Views)

- **Filters in URL**: `?f=base64url(JSON.stringify({ groups:[{op:"AND", rules:[{k:"type",op:"in",v:["user","host"]}] }]}))`
- **Saved View**: `/ig?view=<viewId>`; if both `view` and `f` present, `view` wins; warn on divergence.
- **Share**: `CopyLink` copies canonical URL; include `v=` version to handle schema evolutions.

---

## 29) Keyboard & Accessibility Map

- Global: `?` help overlay; `g f` focus filter bar; `g s` open Saved Views; `Esc` close panels.
- Graph: `+/-` zoom, arrows pan, `Shift` hover‑card sticky, `Ctrl/Cmd+A` select all visible, `Backspace` clear selection.
- MC tables: `j/k` next/prev row, `Space` toggle select, `Enter` open drawer.
- All modals: focus trap; `Tab` logical order; ARIA roles: `dialog`, `grid`, `tooltip`; live regions for async ops.

---

## 30) Telemetry Schema Registry (JSON Schema samples)

```json
{
  "$id": "ig_pan_zoom.schema.json",
  "type": "object",
  "required": [
    "user_id",
    "org_id",
    "nodes_visible",
    "edges_visible",
    "fps_avg",
    "zoom_level",
    "flag_state"
  ],
  "properties": {
    "user_id": { "type": "string", "format": "uuid" },
    "org_id": { "type": "string", "format": "uuid" },
    "nodes_visible": { "type": "integer", "minimum": 0 },
    "edges_visible": { "type": "integer", "minimum": 0 },
    "fps_avg": { "type": "number", "minimum": 0 },
    "zoom_level": { "type": "integer", "minimum": 10, "maximum": 400 },
    "flag_state": { "type": "string", "enum": ["on", "off"] }
  }
}
```

---

## 31) Feature Flags — Config Templates

**Unleash example**

```json
{
  "name": "ig_minimap",
  "enabled": false,
  "strategies": [{ "name": "default", "parameters": {} }],
  "variants": []
}
```

**LaunchDarkly YAML (relay proxy)**

```yaml
flags:
  ig_saved_views:
    on: false
    variations: [{ value: true }, { value: false }]
    fallthrough: { variation: 1 }
    targets:
      - values: ['internal']
        variation: 0
  mc_rbac_editor:
    on: false
    variations: [{ value: true }, { value: false }]
    fallthrough: { variation: 1 }
```

---

## 32) E2E — Playwright Skeletons (selectors use `data-testid`)

```ts
import { test, expect } from '@playwright/test';

test('MC: create role and assign users', async ({ page }) => {
  await page.goto('/mc/users');
  await page.getByTestId('bulk-select-all').click();
  await page.getByTestId('bulk-assign-role').click();
  await page.getByTestId('role-editor-open').click();
  await page.getByTestId('role-name-input').fill('Incident Commander');
  await page.getByTestId('perm-grid-cell-users-admin').click();
  await page.getByTestId('save-role').click();
  await expect(page.getByText('Role created')).toBeVisible();
});

test('IG: saved view share link restores filters', async ({ page }) => {
  await page.goto('/ig');
  await page.getByTestId('filter-add').click();
  await page.getByTestId('filter-type').fill('host');
  await page.getByTestId('save-view').click();
  const url = await page.getByTestId('share-link').inputValue();
  await page.goto(url);
  await expect(page.getByTestId('filters-bar')).toContainText('host');
});
```

---

## 33) Performance Instrumentation (Web Vitals & Marks)

```ts
performance.mark('graph:render:start');
// render graph
performance.mark('graph:render:end');
performance.measure('graph:render', 'graph:render:start', 'graph:render:end');
const m = performance.getEntriesByName('graph:render').pop();
track('ig_render', { duration_ms: Math.round(m.duration), nodes: n, edges: e });
```

**Budget checks:** assert in dev if `duration_ms > 2000` for initial render; log to console + send sample to telemetry (rate‑limited).

---

## 34) Code Quality & PR Template

**Conventional Commits**: `feat(ig): add minimap`, `fix(mc): a11y label for role grid`, `perf(ig): virtualize edges`.

**PR template**

```
## Summary

## Screenshots / Screenreader transcript

## How to test

## Accessibility
- [ ] Keyboard‑only
- [ ] Screenreader
- [ ] Contrast

## Telemetry
- Events:

## Risk & Rollback

## Checklist
- [ ] Unit tests
- [ ] Storybook
- [ ] Docs/Notes
```

---

## 35) Rollback & Kill‑Switch Runbook

- Toggle off flags: `ig_minimap`, `ig_saved_views`, `mc_rbac_editor`.
- Revert deploy: roll back to previous RC; invalidate CDN for `/static/js/ui-*`.
- Data safety: Saved Views created during canary remain; no destructive migrations.
- Comms: post status in #incident‑ui; link to issue; owner + ETA for next update.

---

## 36) Support & Docs Enablement

- 5‑min internal deck: features, flags, known limitations, how to capture repro steps.
- Short Loom/GIFs for Saved Views, Role Editor, Webhook Test.
- In‑product help links to docs with anchors: `/docs/ig/saved-views`, `/docs/mc/rbac`, `/docs/mc/webhooks`.

---

## 37) Service Readiness Checks (pre‑freeze)

- **Saved Views API**: 99p latency < 300 ms; idempotent create with client token.
- **Audit Export**: queue workers ≥ 2; S3/GCS bucket perms; temporary URLs expire in 24h.
- **Webhook Test**: outbound egress allowed; retry policy off for manual tests; redact secrets in payload logs.

---

## 38) Privacy, Security & Compliance Checklist

- PII tagging in telemetry (deny‑list on `bodyPreview`).
- CSRF tokens on MC dangerous actions; double‑confirm for destructive ops.
- CSP rules: disallow inline scripts; allowlist CDNs in use.
- Secrets masked at rest and in UI; copy‑to‑clipboard places masked value by default unless revealed.

---

## 39) Risk Register (expanded)

| Risk                            | Likelihood | Impact | Owner | Trigger                       | Mitigation                                                  |
| ------------------------------- | ---------: | -----: | ----- | ----------------------------- | ----------------------------------------------------------- |
| Backend API slippage            |        Med |   High | PM    | Contract not merged by Sep 16 | Mock server + local persistence                             |
| Graph perf misses on low‑end HW |        Med |    Med | FE‑A  | p95 > 200ms in staging        | Reduce detail level; simplify edge shaders; disable shadows |
| A11y regressions in dark mode   |        Low |    Med | FE‑C  | axe < 95                      | Token contrast adjustments; targeted fixes                  |
| CSV export timeouts             |        Med |    Med | FE‑C  | >30s exports                  | Async export with progress; chunked download                |

---

## 40) Dashboards — Sample Queries

**Saved Views adoption (SQL‑ish)**

```sql
SELECT date_trunc('day', ts) d, count(*) views
FROM events
WHERE name = 'ig_saved_view_opened'
AND env = 'prod'
GROUP BY 1 ORDER BY 1;
```

**MC Admin throughput**

```sql
SELECT action_type, count(*) c
FROM events
WHERE name = 'mc_user_bulk_action' AND success = true
GROUP BY 1 ORDER BY c DESC;
```

---

## 41) Dark Mode Parity — Checklist

- Token coverage across: backgrounds, borders, focus rings, chart palettes.
- Screenshot diffs stored as artifacts per PR; threshold ≤ 0.5%.
- Forms: error states meet 4.5:1 against bg; links have non‑color affordance (underline).

---

## 42) Contingency & Scope Cut Lines

- **Drop line A (keep quality)**: IG‑107, MC‑126, MC‑125.
- **Drop line B (if needed)**: IG‑104 bulk actions (retain selection), MC‑122 export (retain filters only).
- **Never cut**: A11y passes (IG‑108, MC‑127), Instrumentation (IG‑109, MC‑128).

---

## 43) UX Copy & Microcopy (draft)

**IG**

- Hover Card title: "${entity.label}" — subtitle: "${entity.type} • Risk ${riskScore}"
- Bulk Action toast: "Applied **${action}** to ${count} item(s). Undo"
- Saved View modal: Name placeholder “Triage — High Risk Hosts (Last 24h)”
- Empty state (no matches): "No results. Adjust filters or clear them to see more of the graph."

**MC**

- Role conflict banner: "This role overlaps with existing permission **${roleName}**. Review before saving."
- Webhook test result: "Responded in ${latencyMs} ms with status ${code}. View details"
- Audit export: "We’re preparing your CSV. We’ll notify you when it’s ready to download."

Tone: concise, action‑oriented, avoids blame; always include a recovery path.

---

## 44) Accessibility — Screenreader Scripts (NVDA/VO + ChromeVox)

- Open Role Editor: "Role Editor dialog. Permission matrix grid, 10 rows, 6 columns. Use arrow keys to navigate."
- Minimap toggle: "Minimap on. Use plus and minus to zoom, arrows to pan."
- Filter chip removal: "Removed filter: ${label}. Remaining ${count}."
- Webhook secret reveal: "Sensitive value revealed. Press Escape to hide."

Live regions: `aria-live="polite"` for async notifications; `aria-atomic="true"` for toasts.

---

## 45) Error Taxonomy → User Mapping

| Code                       | Origin    | Meaning                     | UI Treatment                              |
| -------------------------- | --------- | --------------------------- | ----------------------------------------- |
| `IG_LAYOUT_TIMEOUT`        | FE Worker | Layout exceeded budget      | Non-blocking banner + reduce detail level |
| `SV_CONFLICT_409`          | API       | Saved View name conflict    | Inline error + rename suggestion          |
| `AUDIT_EXPORT_202_STALLED` | API       | Export job stalled          | Progress warning + retry button           |
| `WEBHOOK_4XX`              | Remote    | Client error (bad URL/auth) | Inline details (sanitized) + docs link    |
| `WEBHOOK_5XX`              | Remote    | Server error                | Advise retry; suggest backoff             |

---

## 46) Observability — FE Logs, Metrics, Traces

- **Logs**: debug (dev only), info (feature flags, navigation), warn (retries), error (uncaught, API failures). Redact PII.
- **Metrics**: counters (`ig_action_count`), timers (`ig_render_ms`), gauges (`ig_nodes_visible`).
- **Tracing**: `traceparent` propagate to API; add spans: `ui.render.graph`, `ui.table.virtualize`, `ui.webhook.test`.

Sampling: 100% for canary, 10% thereafter; always sample errors.

---

## 47) Performance Budgets by Surface

| Surface           | Metric          | Budget                    | Tooling                   |
| ----------------- | --------------- | ------------------------- | ------------------------- |
| IG initial render | TTI             | ≤ 2.0 s                   | Web Vitals + custom marks |
| IG interactions   | p95 frame time  | ≤ 16 ms                   | RAF sampling              |
| MC Users table    | p95 scroll jank | ≤ 10 dropped frames / 10s | RAF + PerformanceObserver |
| Role Editor       | open time       | ≤ 300 ms                  | mark/measure              |

Gate in CI: fail PR if budgets regress by >10% vs baseline.

---

## 48) Data Classification Matrix (UI‑visible fields)

| Field          | Class     | Storage                       | Telemetry          |
| -------------- | --------- | ----------------------------- | ------------------ |
| user.email     | Sensitive | Mask in UI, never store in FE | Hash (salted) only |
| webhook.secret | Secret    | Masked; reveal on hold        | NEVER              |
| audit.actor_id | Internal  | OK                            | OK                 |
| entity.label   | Low       | OK                            | OK                 |

---

## 49) Threat Model (STRIDE snapshot)

- **Spoofing**: forged webhook endpoints → validate URL scheme/host allowlist; DNS pinning not applicable; warn on private IPs.
- **Tampering**: audit export integrity → server‑side signed URLs; checksum in metadata.
- **Repudiation**: admin actions → signed audit entries w/ request IDs; show in UI.
- **Information Disclosure**: hover cards/XSS → sanitize rich fields; CSP; escape in tooltips.
- **DoS**: graph render flood → input throttling, workerization, backpressure on layout jobs.
- **Elevation of Privilege**: RBAC editor misuse → confirm destructive changes; require admin scope; show diff preview.

---

## 50) Contract Tests (FE⇄API) — Pact outline

- IG Saved Views: `create`, `conflict 409`, `rename`, `delete 204`.
- Audit Export: `start 202 + Location`, `poll 200 complete`, `poll 200 in_progress`.
- Webhook Test: `200 success`, `400 bad url`, `500 remote error`.

---

## 51) Non‑Functional Acceptance Tests (how to run)

1. Seed fixtures (see §19).
2. Enable flags in staging.
3. Run perf suite (headless + headful) on low‑end profile (4 GB RAM, integrated GPU).
4. A11y sweep: NVDA + axe; record issues with screenshots and steps.
5. Security checks: CSP headers validated; try reflective XSS payloads in safe playground; CSRF token presence.

---

## 52) UAT Plan (stakeholders & scripts)

- **Stakeholders**: SOC lead (IG), Platform admin (MC), Support lead.
- **Scenarios**:
  - IG: Build view for "Hosts w/ inbound lateral movement last 24h"; share with team; act on 20 nodes.
  - MC: Create "Incident Commander" role; bulk assign to 200 users; test webhook to SIEM; export last week’s audit.
- **Sign‑off**: pass rate ≥ 90%; criticals fixed before GA.

---

## 53) Support Playbooks

- **Saved View missing**: check feature flag, then API `/saved-views`; recover via local backup; share link regeneration.
- **Webhook failing**: validate URL, TLS, auth header; show last response; suggest retry/backoff; escalate if 5xx > 3.
- **Users table slow**: confirm virtualization on; reduce column count; check client hardware profile.

---

## 54) Rollout Guardrails & Expansion Policy

- Start: 10% internal for 48h.
- Expand to 50% if: error rate < 1%, p95 render < 2.2s (IG), no P1s.
- Expand to 100% if: adoption > baseline +20%, no new P1s in 24h.
- Auto‑rollback if: error rate > 2% for 30m or perf budget exceeded by 25%+.

---

## 55) Customer Comms Templates

**Changelog snippet**
"Investigation Graph gets faster navigation and shareable Saved Views (beta). Management Console introduces a Role Editor, bulk user actions, and webhook testing."

**In‑app banner**
"New: Faster graph + Saved Views (beta). Try it →"

**Email (admin)**
Subject: "New MC Role Editor, audit export, & webhooks test (beta)"
Body: What’s new, how to enable, docs links, opt‑out.

---

## 56) Analytics Dashboards (spec skeleton)

```yaml
- dashboard: IG Interaction Health
  tiles:
    - timeseries: ig_render_ms p95
    - bar: ig_action_count by action
    - number: saved_view_created last 7d
- dashboard: MC Admin Throughput
  tiles:
    - table: mc_user_bulk_action success rate by day
    - timeseries: webhook_test_sent latency p95
```

---

## 57) UI SLOs (targets & alerts)

- **Availability** (UI routes respond): 99.9%/30d via CDN health.
- **Perf**: IG TTI ≤ 2.0s p90; MC page open ≤ 1.2s p90.
- **Error Rate**: < 1% UI error events per session.
- **A11y**: axe ≥ 95 on tracked pages.
  Alerts wired to #ui‑alerts with runbooks.

---

## 58) i18n/L10n Readiness

- Externalize strings in `en.json`; ICU message format for plurals.
- No concatenated strings; placeholders named.
- Directionality tested (RTL mode snapshot).

---

## 59) Architecture Notes (module boundaries)

- `@app/ig` (graph engine, views, filters) isolated from `@app/mc` (admin, settings) with shared `@ui` component library and `@tokens`.
- Cross‑cut utils: analytics, feature flags, a11y helpers, http client with interceptors.

---

## 60) Dev Environment & Tooling

- Node LTS, PNPM; TS strict; ESLint + Prettier; Vitest/Jest for unit; Playwright for E2E.
- Pre‑commit hooks: typecheck, lint, unit tests (changed files).
- Storybook in CI with a11y addon; visual diffs via Chromatic/Playwright screenshots.
