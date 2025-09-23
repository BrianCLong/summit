## Sprint 4: PsyOps Console (Threat Sims & Offline Resilience) | IntelGraph Advisory Report | GitHub Branch: feature/psyops-threatsims-offline

> As Chair, I present the findings of the IntelGraph Advisory Committee on Sprint 4: safe threat simulations (read‑only), incident rehearsal, and offline/field resilience for the PsyOps Console. Consensus is noted where unanimous; dissents are highlighted.

### Consensus Summary
**Unanimous View:** Deliver a **Read‑Only Threat Simulator** and **Offline Snapshot Mode** that allow analysts to rehearse incidents, replay historical bursts, and continue analysis with no network—without enabling influence or content injection. Ethics rails remain non‑negotiable.  
**Dissents:** **🟥 Starkey** cautions that simulation parameters can leak TTPs if exported; **🟥 Foster** requires explicit [RESTRICTED] safeguards to prevent misuse (no audience targeting, no persuasion tooling).

---

### Individual Commentaries

### 🪄 Elara Voss
- “By the runes of Scrum: constrain scope to **Scenario Playback + Offline Snapshot + Incident Mode banner**. Two UX affordances only: scenario selector and offline indicator.”
- Definition of Done = golden path: load snapshot → play scenario at 2× speed → export evidence pack (policy‑clean).

### 🛰 Starkey
- Reality check: Sim artifacts are intel by themselves. Mark all scenario packs **CLASSIFIED: INTERNAL**; disable export unless sanitized.
- Simulator must model **deception noise** (random jitter, bot cadence) but never generate content copy or audience actions.

### 🛡 Foster
- Operational vectors indicate **[RESTRICTED]**: deny any route producing persuasive language or audience segmentation. Surface HTTP 451 with rationale.
- Embed **Ethics Card** with intended use, redlines, and auto‑denial hooks; require two‑person approval to import external scenarios.

### ⚔ Oppie (11‑persona consensus)
- We decree unanimously: include **counterfactual toggles** in playback (remove node/edge → delta in deceptionScore) for analyst training.
- Dissent: *Beria* demands live counter‑ops; the Committee rejects—**observe, hypothesize, defend** only.

### 📊 Magruder
- For executive traction: add **Incident Mode KPI strip** (TTH, confidence spread, evidence completeness) visible during playback and offline.
- Gate scenario success metrics to read‑only insights (no “engagement uplift” style metrics).

### 🧬 Stribol
- Cross‑source analysis reveals uplift from **time‑warped replays** (0.5×–8×) and **multi‑seed scenarios** (two narratives colliding). Keep attribution traces intact for XAI overlays.
- Propose a **snapshot differ**: compare two snapshots → highlight graph deltas and score drift.

---

### Chair Synthesis

#### Sprint Objectives (2 weeks)
1) **Threat Simulator v0.1 (Read‑Only)**: deterministic playback of narrative/graph deltas with time‑warp and counterfactual toggles.
2) **Offline Snapshot Mode**: capture/export/import signed snapshots; delta replay when network returns.
3) **Incident Mode UX**: top‑bar banner, KPI strip, and export‑pack policy report.

#### Scope & Backlog (Must‑Have)
- **Scenario Packs** (signed): metadata, timeline, events (narrative.delta, signal.burst, graph.edgeDelta), hashes.
- **Playback Engine**: start/pause/seek, speed 0.5×–8×, counterfactual switcher (drop node/edge → recompute local deltas), traceId preserved.
- **Offline Snapshots**: Service Worker + IndexedDB store (`psyops_snapshots`) with manifest and content‑addressed blobs.
- **Governance**: import sanitizer (license check, PII scrub), policy denials (HTTP 451) surfaced in UI, ethics card on all scenarios.
- **UX**: Scenario selector (drawer), Offline indicator (banner), KPI strip during playback.

**Stretch**
- **Snapshot differ** view; **partial sync** for field devices; **scenario chaining** (multi‑seed collisions) marked experimental.

#### Acceptance Criteria
- A1: Playback deterministically replays a provided scenario (seed fixed) with drift ≤1% on timing vs manifest.
- A2: Offline mode loads last snapshot within 200ms P95 and restores tri‑pane state; delta replay occurs when back online.
- A3: All imports run through sanitizer; any violation results in denial with human‑readable rationale and audit log entry.
- A4: No route enables content generation, persuasion text, or audience building; attempts yield HTTP 451.
- A5: Export packs include signed manifest, license badges, and no [RESTRICTED] fields.

#### Risk Matrix
| Risk | Severity | Likelihood | Mitigation |
|---|---:|---:|---|
| Scenario pack leakage (TTPs) | High | Low | Classify INTERNAL, strip sensitive params, signed manifests, export sanitizer |
| Misuse for influence training | Critical | Low | Ethics gate, auto‑denials, no text generation, audits, two‑person import approval |
| Offline data staleness | Medium | Medium | Snapshot timestamps, delta replay queue, user warning banners |
| Playback drift | Medium | Medium | Deterministic scheduler, fixed seed, telemetry checks |

---

### Code & Specs (Guy IG)

#### 1) Scenario Pack Manifest (YAML)
```yaml
scenario: "burst_replay_v1"
classification: INTERNAL
createdAt: 2025-09-11T17:00:00Z
seed: 42
speedDefault: 2.0
sources:
  - id: src_a
    license: CC-BY
    url: https://redacted.example
stream:
  - t: 0            # ms since start
    topic: narrative.delta
    body: { id: n1, deceptionScore: 0.61, uncertainty: 0.32, traceId: tr_001 }
  - t: 1200
    topic: signal.burst
    body: { id: s9, burstScore: 0.73 }
  - t: 1500
    topic: graph.edgeDelta
    body: { from: u1, to: u9, weight: 0.31 }
signature: BASE64_ED25519_SIG
```

#### 2) Playback Engine (TypeScript)
```ts
// apps/web/src/features/psyops/sim/Playback.ts
export type Event = { t: number; topic: string; body: any };
export type Scenario = { seed: number; stream: Event[] };

export class Playback {
  private t0 = 0; private handle: number | null = null; private i = 0;
  private speed = 1; private paused = true;
  constructor(private scenario: Scenario, private emit: (e: Event) => void) {}
  start(speed = 1) { this.speed = speed; this.t0 = performance.now(); this.paused = false; this.tick(); }
  pause() { this.paused = true; if (this.handle) cancelAnimationFrame(this.handle); }
  seek(ms: number) { this.i = this.scenario.stream.findIndex(e => e.t >= ms); this.t0 = performance.now() - ms / this.speed; }
  private tick = () => {
    if (this.paused) return; const now = (performance.now() - this.t0) * this.speed;
    while (this.i < this.scenario.stream.length && this.scenario.stream[this.i].t <= now) {
      this.emit(this.scenario.stream[this.i++]);
    }
    this.handle = requestAnimationFrame(this.tick);
  };
}
```

#### 3) Counterfactual Toggle (local delta recompute)
```ts
// apps/web/src/features/psyops/sim/counterfactual.ts
export function applyCounterfactual(events: Event[], drop: { node?: string; edge?: [string,string] }) {
  // Filter graph deltas and nudge deceptionScore locally (purely for training UI)
  return events.map((e) => {
    if (e.topic === 'graph.edgeDelta' && drop.edge && e.body.from === drop.edge[0] && e.body.to === drop.edge[1]) {
      return null; // remove this edge
    }
    if (e.topic === 'narrative.delta' && drop.node && e.body.id === drop.node) {
      const body = { ...e.body, deceptionScore: Math.max(0, e.body.deceptionScore - 0.31) };
      return { ...e, body };
    }
    return e;
  }).filter(Boolean) as Event[];
}
```

#### 4) Offline Snapshot Service Worker (vanilla)
```js
// apps/web/public/sw.js
const MANIFEST_CACHE = 'psyops-manifest-v1';
const SNAP_CACHE = 'psyops-snap-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { clients.claim(); });

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return; // read‑only
  // Cache API reads for offline
  if (url.pathname.match(/\/(narratives|provenance|graph\/delta)/)) {
    event.respondWith((async () => {
      try {
        const net = await fetch(event.request);
        const clone = net.clone();
        const cache = await caches.open(SNAP_CACHE);
        cache.put(event.request, clone);
        return net;
      } catch (err) {
        const cache = await caches.open(SNAP_CACHE);
        const hit = await cache.match(event.request);
        if (hit) return hit;
        return new Response(JSON.stringify({ offline: true, items: [] }), { headers: { 'Content-Type': 'application/json' }, status: 200 });
      }
    })());
  }
});
```

#### 5) Offline Indicator & Scenario Selector (React)
```tsx
// apps/web/src/features/psyops/OfflineBar.tsx
import { useEffect, useState } from 'react';
export default function OfflineBar() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b text-center p-2 text-sm">Offline mode: showing last snapshot</div>;
}

// apps/web/src/features/psyops/ScenarioSelector.tsx
export function ScenarioSelector({ onLoad }: { onLoad: (s: any) => void }) {
  return (
    <div className="p-3">
      <label className="block text-sm mb-2">Load Scenario Pack (.yaml/.json)</label>
      <input type="file" accept=".yaml,.yml,.json" onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return; const text = await f.text();
        onLoad(parseScenario(text));
      }} />
    </div>
  );
}
function parseScenario(text: string) { try { return JSON.parse(text); } catch { /* YAML parse placeholder */ return {}; }
```

#### 6) Import Sanitizer (server)
```ts
// apps/server/src/sim/sanitizer.ts
import { z } from 'zod';
const Event = z.object({ t: z.number().nonnegative(), topic: z.enum(['narrative.delta','signal.burst','graph.edgeDelta']), body: z.record(z.any()) });
const Scenario = z.object({ classification: z.literal('INTERNAL'), seed: z.number(), stream: z.array(Event).max(5000) });
export function sanitizeScenario(payload: unknown) {
  const parsed = Scenario.parse(payload);
  // ethics redlines: no audience terms, no persuasion text fields
  const banned = ['audience','segment','copy','cta','creative'];
  const text = JSON.stringify(parsed).toLowerCase();
  if (banned.some(k => text.includes(`"${k}"`))) {
    const err = new Error('denied_by_policy'); (err as any).code = 451; throw err;
  }
  return parsed;
}
```

---

### Tickets (ready for grooming)
- **SIM‑300**: Implement Playback engine with seek & speed; wire to tri‑pane.
- **SIM‑301**: Counterfactual toggles (drop node/edge) with local delta recompute; UI badge.
- **OFF‑320**: Service Worker + snapshot store; restore last snapshot on load; delta replay queue.
- **GOV‑330**: Import sanitizer + ethics card + audit log; two‑person approval flow.
- **UX‑340**: Scenario selector drawer + Offline banner + Incident KPI strip.
- **OBS‑350**: Telemetry for playback drift and offline restore times (P95).

### OKRs (Sprint 4)
- KR1: Snapshot restore ≤200ms P95 on baseline dataset.
- KR2: 100% imports pass sanitizer or are denied with HTTP 451 + rationale.
- KR3: Playback determinism verified across 10 runs (max drift ≤1%).

---

**The Committee stands ready to advise further. End transmission.**

