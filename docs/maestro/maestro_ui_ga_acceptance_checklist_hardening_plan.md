# Maestro UI — GA Acceptance Checklist & Hardening Plan

**Context:** Maestro is the standalone **conductor** that builds Intelgraph (Maestro ≠ Intelgraph). The UI is reported _production‑ready_. This checklist validates GA quality and defines hardening steps to de‑risk rollout.

---

## 1) Scope of Validation

**Surfaces**

- Web Console: Dashboard, Runs, Run Detail (Logs, Artifacts, Metrics, **Evidence**), **Router Decision + Explain**, **DLQ & Simulator**, **AlertCenter**, **Tenant Costs (Forecast/Anomalies/Budgets)**, **Provider Rates**, **Observability (Serving Lane)**, **CICD trends**, Policies, Secrets, Settings, Audit.
- VS Code extension (out of band but referenced for parity).
- Linked Grafana dashboards.

---

## 2) P0 Acceptance Criteria (by area)

> _Each item must pass in **staging** and **prod** with screenshots or exported results attached to the release._

### 2.1 Dashboard

- P95 TTI ≤ **2.5s**; counters live‑update ≤ **2s** after backend change.
- Filters and tenant/env switching persist across navigation.

### 2.2 Runs (List + Detail)

- Virtualized table renders **500 rows** smoothly; search and filters combine (AND) with free‑text.
- DAG renders ≤ **100 nodes < 1s** (≤ 500 nodes < 2.5s progressive); node inspector opens < **300ms**.
- Bulk actions (cancel/pause/resume/retry) respect RBAC; audit entries created.
- Logs stream at **≥ 1e5 lines** (windowed) without UI jank; copy‑to‑clipboard preserves timestamps.

### 2.3 Router Decision + Policy Explain

- Panel shows selected model, candidate scores, and policy snippet.
- **Explain** opens inline popover and full dialog; result + reason + rule hits render.
- 95th percentile explain latency < **800ms** (cached or simulated) and is keyboard accessible.

### 2.4 Evidence

- Badges show **Cosign**, **SBOM**, **SLSA**, **Provenance** (verified/unverified states).
- “Copy SBOM digest”, “Copy verify cmd”, and “Export provenance JSON” work; disabled w/ tooltip if missing.

### 2.5 DLQ & Simulator

- Root‑cause groups visible (network/auth/policy/timeout/unknown); counts and last‑seen timestamps correct.
- **Replay** from DLQ removes item and appends event into run timeline.
- **Policy simulate** returns ALLOW/DRY_RUN/DENY with reasons; reasons human‑readable.

### 2.6 Tenant Costs

- Forecast (EMA) graph & anomalies (z‑score) present; budgets create/update; alert routes CRUD; “Test alert” posts to AlertCenter.

### 2.7 AlertCenter

- Lists routes and merged events (CI, SLO burns, forecast BREACH) with **correlation groups**; deep links open filtered Run/Evidence.

### 2.8 Provider Rates

- 5s refresh table shows RPM, limits, drop %, p95; inline “Set limit” updates and persists.

### 2.9 Observability → Serving Lane

- Stat cards (qDepth, batch, kvHit) and 3 sparklines render; refresh without layout shift.

### 2.10 CICD Trends

- Stacked area chart for failures/warnings/notices; clicking a bucket filters the list; time window respected.

### 2.11 Policies, Secrets, Settings, Audit

- No plaintext secret ever visible; “Rotate” works; “Test connection” returns pass/fail with reasons.
- Policy editor enforces review → publish; dry‑run results annotated in Runs.
- All privileged actions appear in **Audit Log** with who/what/where/why.

---

## 3) A11y Validation (WCAG 2.2 AA)

- Keyboard‑only traversal across all critical flows: **Dashboard → Run detail → Explain → Evidence → Approve/Promote**.
- Focus trap for dialogs; **Escape** closes; `aria-*` for charts/popovers/buttons; charts wrapped in `role="group"` with `aria-label`.
- Contrast ≥ 4.5:1 for text; reduced‑motion honors OS setting.
- Automated scans: `axe` shows **0 critical** issues on all P0 screens.

**Commands (example)**

```bash
# Playwright + axe run
npx playwright test --project=chromium --grep @a11y
```

---

## 4) Performance & Resilience Budgets

- First view **TTI ≤ 2.5s P95**; route change ≤ **250ms P95**.
- JS bundle budgets (gzip): app ≤ **250KB**, vendor ≤ **350KB**; code‑split Maestro routes under `/maestro`.
- Error boundary captures UI exceptions; offline banner for fetch failures; exponential backoff on SSE/WebSocket reconnects.

**Lighthouse CI (example)**

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:5173/#/maestro/tenants/costs"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": { "categories:performance": ["warn", { "minScore": 0.9 }] }
    }
  }
}
```

---

## 5) Security & Privacy

- **CSP** headers present (script-src 'self' plus hashes; connect-src includes API and Grafana only).
- **XSS**: sanitize rich text; logs rendered in `<pre>` escaped; no `dangerouslySetInnerHTML` without sanitizer.
- **Clickjacking**: `frame-ancestors 'none'`.
- **CSRF**: token or double‑submit on state‑changing routes.
- **Trace context**: propagate `traceparent` from UI to backend (for OTEL correlation).

**CSP sketch**

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://grafana.example.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self';
```

---

## 6) Observability (UI)

- FE OTEL enabled; actions instrumented (run start, approve, replay, promote).
- Error logs include correlation ID; link back to relevant Grafana panel.

---

## 7) E2E Test Matrix (Playwright)

- **Runs**: start → watch logs → policy deny → budget warn → approve → promote (happy & failure paths).
- **Explain**: open popover → open dialog → copy trace JSON.
- **Evidence**: open → copy digest → open SBOM/SLSA; missing states handled.
- **DLQ**: simulate failure → appears in DLQ → replay → disappears.
- **AlertCenter**: create forecast route → test alert → correlated event appears.
- **Provider**: set RPM limit → flagged row.

---

## 8) Deployment Readiness

- Base path **/maestro** verified; assets hashed; static caching w/ long max‑age + immutable.
- Feature flags: scorecard gate, DLQ replay, policy editor, AlertCenter correlations (per tenant).
- Blue/green UI rollout; canary at **10%** users for 24–48h; rollback flips origin to previous build.

---

## 9) Docs & Enablement

- **UI Tour** with screenshots; **Quickstart** for new users (start a run, read DAG, check Evidence, approve gate).
- **Operator guide**: AlertCenter, Provider Rates, DLQ replay.
- **A11y notes**: keyboard shortcuts, command palette.

---

## 10) Go/No‑Go Checklist (UI)

- [ ] A11y: 0 critical axe issues; keyboard flows pass.
- [ ] Perf budgets met on Dashboard, Runs list, Run detail.
- [ ] Security: CSP, XSS sanitation, CSRF verified.
- [ ] Observability: FE OTEL spans landing in backend traces.
- [ ] E2E suite green (happy + failure paths).
- [ ] Docs published; on‑call playbooks linked from UI (help menu).

---

## 11) Known Nits / Follow‑ups

- Ensure repeated copy in commit history (duplicate Router Decision bullet) is squashed before release notes.
- Consider high‑contrast theme tuning for chart gridlines to meet contrast in dark mode.
- Optional: “Verify now” action for provenance to re‑run verification without page refresh.

---

## 12) Sign‑off

- **Product/PM:** UI meets IA and copy standards (Maestro ≠ Intelgraph reinforced).
- **Security:** Evidence flows and policy explain verified; no PII in telemetry.
- **SRE:** Dashboards linked; AlertCenter integrated; rollback tested.
- **DX:** Command palette, keyboard flows, and quickstarts validated.
