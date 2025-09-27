# [P0] Tri‑Pane Time‑Brush Sync Fix — Ready‑to‑Merge PR Package

> Ticket: INV‑1432 • Feature Flag: `triPaneBrushSyncFix` • Client: Orion Threat Intel (prod + staging)

## 1) PR Title & One‑liner
**Title:** Fix: Timeline brush re‑syncs Map & Graph panes with unified time range, states, and telemetry
**One‑liner:** Brushing a time window now orchestrates pane re‑queries, shows user‑visible syncing states, and guarantees consistency (or actionable errors) across Timeline, Map, and Graph.

## 2) Scope & Impact
- **In scope:** tri‑pane orchestration, time‑range propagation, keyboard flow, states (loading/empty/error/offline/policy‑blocked), toasts, a11y, telemetry.
- **Out of scope:** engine performance tuning, unrelated facets, mobile layout.
- **Risk:** Medium (core view). Mitigations: feature flag, canary, rollback plan.

## 3) Rollout Plan
- **Flag:** `triPaneBrushSyncFix`
- **Canary:** `orion-staging` 5%→25%→100% in 24h
- **Metrics guardrails:** p95 sync ≤ 1.8s; error rate < 1%. Auto‑rollback if breached twice in 30m.
- **Runbook:** `runbooks/tri_pane_sync.md` (updated below).

## 4) Architecture Notes
**Goal:** A single source of truth for the brushed time range and an atomic “sync cycle” for all panes.

### 4.1 Data Flow (high level)
1. User brushes on **Timeline** → `timeRangeChanged(range, source=timeline)`.
2. Orchestrator sets **syncCycle.id** and pushes `range` to shared store.
3. **Map** and **Graph** listen → cancel inflight, fetch with `range`.
4. Each pane reports `paneSync.{start|success|error}` with `syncCycle.id`.
5. Orchestrator resolves cycle when all panes settled (success/handled error).

### 4.2 Sync Algorithm (pseudo)
```ts
onTimeBrush(range) {
  syncCycle = { id: uuid(), range }
  publish(Store.setRange(range, syncCycle.id))
  publish(Events.SyncStart(syncCycle))
  await Promise.allSettled([
    panes.map.fetch(range, syncCycle.id),
    panes.graph.fetch(range, syncCycle.id)
  ])
  if (allSuccess) toast("Panes synced to …")
  else showActionableErrors()
}
```

## 5) Code Changes (Patch Plan)

**Files touched**
- `apps/web/src/features/investigate/TriPaneOrchestrator.ts` **(new)**
- `apps/web/src/features/investigate/state/timeRangeStore.ts`
- `apps/web/src/features/investigate/Timeline.tsx`
- `apps/web/src/features/investigate/MapPane.tsx`
- `apps/web/src/features/investigate/GraphPane.tsx`
- `apps/web/src/features/investigate/components/SyncBanner.tsx` **(new)**
- `apps/web/src/instrumentation/telemetry.ts`
- `apps/web/src/features/investigate/__tests__/…`
- `apps/web/e2e/tri-pane-sync.spec.ts`
- `docs/help/explain-tri-pane.md`
- `runbooks/tri_pane_sync.md`

**Types**
```ts
// timeRangeStore.ts
export type TimeRange = { start: string; end: string; tz: string } // ISO8601
export type SyncCycle = { id: string; range: TimeRange }
```

**Store & Actions**
```ts
// timeRangeStore.ts
import { create } from 'zustand'
interface State { range: TimeRange; syncId?: string }
interface Actions {
  setRange: (range: TimeRange, syncId: string) => void
}
export const useTimeRange = create<State & Actions>((set) => ({
  range: { start: '', end: '', tz: 'UTC' },
  setRange: (range, syncId) => set({ range, syncId })
}))
```

**Orchestrator**
```ts
// TriPaneOrchestrator.ts
import { useEffect } from 'react'
import { useTimeRange } from './state/timeRangeStore'
import { span, metric } from '@/instrumentation/telemetry'

export function useSyncOrchestrator(deps: {
  fetchMap: (id: string) => Promise<void>
  fetchGraph: (id: string) => Promise<void>
}) {
  const { range, syncId } = useTimeRange()
  useEffect(() => {
    if (!syncId) return
    const s = span('tri_pane.sync.start', { syncId, range })
    Promise.allSettled([deps.fetchMap(syncId), deps.fetchGraph(syncId)])
      .then((results) => {
        const ok = results.every(r => r.status === 'fulfilled')
        metric('tri_pane_sync_latency_ms').observe(perfNow() - s.ts)
        if (ok) {
          span('tri_pane.sync.success', { syncId })
          window.dispatchEvent(new CustomEvent('toast', { detail: { msg: `Panes synced to ${fmt(range)}` } }))
        } else {
          span('tri_pane.sync.error', { syncId, results })
          // Let panes render their actionable errors; banner remains dismissible
        }
      })
  }, [syncId, range])
}
```

**Timeline → Brush handler**
```tsx
// Timeline.tsx (excerpt)
const onBrushCommit = (range: TimeRange) => {
  const syncId = crypto.randomUUID()
  useTimeRange.getState().setRange(range, syncId)
  announce(`Syncing panes to ${fmt(range)}…`) // a11y live region
}
```

**Sync Banner**
```tsx
// SyncBanner.tsx
export const SyncBanner = ({ range, syncing }: { range: TimeRange; syncing: boolean }) => (
  <div role="status" aria-live="polite" className="banner">
    {syncing ? `Syncing panes to ${fmt(range)}…` : `Panes synced to ${fmt(range)}`}
  </div>
)
```

**Pane Fetch Contracts**
```ts
// MapPane.tsx (excerpt)
async function fetchMap(syncId: string) {
  try {
    setState('loading')
    const data = await api.map.query(currentRange())
    setData(data); setState(data.empty ? 'empty' : 'ready')
  } catch (e:any) {
    setState({ kind: 'error', action: () => fetchMap(syncId), message: friendly(e) })
  }
}
```

## 6) Telemetry & Analytics

**OTEL Spans**
```ts
// instrumentation/telemetry.ts (excerpt)
export const span = (name: string, attrs: Record<string, any> = {}) => {
  const start = performance.now()
  otel.startSpan(name, attrs)
  return { ts: start }
}
export const metric = (name: string) => ({ observe: (v:number) => prom.record(name, v) })
```

**Prom Metrics**
```ts
// server/metrics.ts
registerHistogram('tri_pane_sync_latency_ms', 'Time to sync panes')
registerCounter('tri_pane_sync_errors_total', 'Sync errors')
registerCounter('tri_pane_policy_blocks_total', 'Policy blocks')
```

**UI Analytics Schema**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UIPaneSyncEvents",
  "type": "object",
  "properties": {
    "ui.timebrush_applied": {"type":"object","properties":{"range":{"type":"string"},"tz":{"type":"string"}}},
    "ui.panes_synced": {"type":"object","properties":{"range":{"type":"string"},"p95":{"type":"number"}}},
    "ui.state_policy_blocked": {"type":"object","properties":{"pane":{"type":"string"},"policy":{"type":"string"}}},
    "ui.kb_shortcut_used": {"type":"object","properties":{"shortcut":{"type":"string"}}}
  },
  "additionalProperties": false
}
```

## 7) Accessibility (WCAG 2.1 AA+)
- **Live regions:** polite announcements for syncing + results.
- **Keyboard:** Tab order cycles Timeline→Map→Graph; `Shift+Tab` reverse; `Ctrl/⌘+Z` undo last brush.
- **Focus management:** focus is trapped within active pane group during keyboard navigation.

**Live Region Helper**
```ts
// a11y.ts
export const announce = (msg: string) => {
  const n = document.getElementById('sr-live')!
  n.textContent = msg
}
```

**DOM node**
```html
<div id="sr-live" aria-live="polite" class="sr-only"></div>
```

## 8) Error Handling Patterns
- Pane‑local actionable error with **Retry** and optional **View logs**.
- Orchestrator does **not** mask individual pane errors.
- Exponential backoff: 250ms→500ms→1s (max 3 retries) for idempotent fetches.

## 9) Tests (DoD)

### 9.1 Unit (Jest + RTL)
```ts
it('propagates brush range to store and announces', () => {
  fireEvent.brush(screen.getByTestId('timeline'), makeRange())
  expect(useTimeRange.getState().range).toEqual(makeRange())
  expect(screen.getByRole('status')).toHaveTextContent('Syncing panes')
})

it('renders Empty state with recovery tips', () => {
  mockMap([]); mockGraph([])
  expect(screen.getByText(/No results/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Clear filters/ })).toBeEnabled()
})
```

### 9.2 E2E (Playwright)
```ts
test('panes sync to brushed range and toast appears', async ({ page }) => {
  await page.goto('/investigate/123')
  await brush(page, '02:00', '08:00')
  await expect(page.getByText('Panes synced to')).toBeVisible()
  await expect(mapLayer(page)).toHaveCountWithin(1, 2000) // sample assertion
})

test('map error surfaces with retry', async ({ page }) => {
  mockApi.fail('map')
  await brush(page, '02:00', '08:00')
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
})
```

### 9.3 Accessibility
```ts
import axe from 'axe-core'
// expect no critical violations on tri‑pane view
```

### 9.4 Performance Harness
- Fixture: `fixtures/orion_case_big_72h.jsonl`
- Script: `scripts/bench/tri_pane_sync.mjs` records p50/p95/p99.
- Pass if p95 ≤ 1.8s @ 50k events; graph lite mode triggers >5k nodes.

## 10) “Explain this view” (Help Copy, i18n‑ready)
**Key:** `help.investigate.triPane`
```
**What am I seeing?**
A synchronized investigation workspace with three panes:
• Timeline shows activity volume over time.
• Map clusters activity by location.
• Graph reveals entities and relationships.

**How brushing works**
Select a time window on the Timeline to focus the other panes on the same range. While data refreshes, you’ll see a syncing banner. If a pane can’t sync, it will show an error with a Retry action.

**Keyboard tips**
Tab to move Timeline→Map→Graph. Shift+Tab to reverse. Press Ctrl/⌘+Z to undo your last brush.

**Lite mode**
For very dense graphs, the view may load a sampled subgraph to stay responsive. You can request the full graph if needed.
```

## 11) Release Notes (Customer‑facing)
**Investigations** — Tri‑Pane time‑brush now keeps Map & Graph in lock‑step with the Timeline. Added clear syncing status, keyboard support, and robust error messages. Performance tuned for large cases; auto “lite mode” for very dense graphs.

## 12) Runbook (Ops)
- **Dashboards:** OTEL `tri_pane.sync.*`, Prom `tri_pane_sync_latency_ms`.
- **Alerts:** error rate >1% over 5m or p95 >1.8s for 2 consecutive intervals.
- **Rollback:** toggle `triPaneBrushSyncFix` off; redeploy `apps/web@main`.
- **Diagnostics:** use correlationId from UI → API → engine traces.

## 13) Acceptance Checklist
- [ ] All states implemented: Default/Loading/Empty/Error/Offline/No‑results/Policy‑Blocked/Unauthorized
- [ ] Keyboard and screen reader paths verified (NVDA/VoiceOver)
- [ ] OTEL spans + Prom metrics visible in staging
- [ ] E2E and unit tests passing; axe shows no criticals
- [ ] Canary complete; guardrail SLOs green
- [ ] Docs/help and runbook updated; release notes added

## 14) Attachments Placeholders
- [ ] GIFs: sync success; error & retry; keyboard‑only flow
- [ ] Figma: Tri‑Pane Brush Sync v4 link
- [ ] Fixtures: `graph_fixture_5k.json`, `map_tiles_stub.mbtiles`

