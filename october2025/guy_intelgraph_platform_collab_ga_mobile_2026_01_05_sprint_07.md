# Guy • IntelGraph Platform Workstream — **Collab 1.0 GA, Motifs v1.1 & Mobile Pilot** (Sprint 07)

**Slug:** `guy-intelgraph-platform-collab-ga-mobile-2026-01-05-sprint-07`  
**Window:** Jan 5–Jan 16, 2026 (10 biz days)  
**Cadence alignment:** Company Sprint 24 (Q1’26). Builds on S06 “Collaborative Intelligence & Motif Library v1”.  
**Repo base:** `summit-main/` (apps/web, server, er-service, prov-ledger, graph-xai, helm, terraform).

---

## 0) Continuity & Strategic Delta

**Shipped up to S06:** Presence/typing, comments & @mentions, Motif Library (temporal triangles, venue co‑occurrence, cross‑channel bursts), ER clustering + unmerge boundaries, notify & motif dashboards.  
**New focus:** Hardening collaboration for **1.0 GA**, expanding motifs with **temporal cascades & bridge detectors**, delivering **Case Space digest notifications** and a **Mobile Web Pilot** (PWA) with read‑only tri‑pane and alerts. Security posture uplift: threat modeling, CSRF/XS leaks audit, and SBOM/attestations as default for all services.

---

## 1) Sprint Goal

Ship **Collab 1.0 GA** and **Motifs v1.1** with enterprise‑grade security/observability, and a **Mobile Web Pilot (PWA)** for on‑call analysts. Keep SLOs green and ensure export/provenance compliance.

**Victory Conditions**

- Case Spaces GA: presence, threads, mentions stable for ≥200 concurrent users; message loss = 0; p95 WS event latency < 150ms intra‑region.
- Motifs v1.1: **temporal 2‑hop cascades** and **community bridge detectors** compute < 2.5s on demo; overlays toggle < 300ms.
- Daily/weekly **digest notifications** (policy‑scoped) deliver < 2min; unsubscribe honored; audit trail captured to prov‑ledger.
- **Mobile PWA**: installable, offline shell, read‑only tri‑pane & alerts; auth via existing JWT; Lighthouse PWA score ≥ 90.
- Security uplift: CSRF/Clickjacking protections verified; SBOM + SLSA attestations built for web/server/er‑service.

---

## 2) Backlog (Stories → Acceptance)

### A. Collaboration GA

1. **Presence Scaling & Health** (`server/src/case-space/presence.ts`, `apps/web/.../presence.tsx`)
   _AC:_ Heartbeat & idle detection; fan‑out batching; per‑room rate limits; health endpoints; chaos test doc.
2. **Threads GA & Moderation** (`server/src/case-space/comments.ts`, `apps/web/.../comments.tsx`)
   _AC:_ Edit windows; soft‑delete with tombstones; role‑based moderation; export to provenance with redact‑on‑export.
3. **Mentions QoS & Directory** (`server/src/notify/directory.ts`, `apps/web/.../mentions.tsx`)
   _AC:_ Policy‑scoped directory with fuzzy match; bounce/opt‑out handling; retries & backoff.

### B. Motifs v1.1

4. **Temporal Cascades (2‑hop)** (`server/src/analytics/motifs/cascades.ts`)  
   _AC:_ Detect A→B→C within Δt with intensity; explain chain; cache & TTL; E2E tests.
5. **Bridge Detectors** (`server/src/analytics/motifs/bridges.ts`)  
   _AC:_ Identify nodes bridging communities (high betweenness / low in‑community PR); overlay + explain card.
6. **Alert Tuning & Snooze** (`server/src/alerts/motifs_snooze.ts`, `apps/web/.../alert-rules.tsx`)  
   _AC:_ Snooze per motif/case/user; rate limit; on‑call calendar windows.

### C. Mobile Web Pilot (PWA)

7. **PWA Shell & Offline** (`apps/web/public/manifest.json`, `apps/web/src/pwa/sw.ts`)  
   _AC:_ Web app manifest, service worker caching (shell + critical APIs), install prompt, offline banner.
8. **Mobile Tri‑Pane (read‑only)** (`apps/web/src/mobile/TriPaneMobile.tsx`)  
   _AC:_ Responsive graph preview, timeline scrub, map viewport; tap selects; alert toasts.
9. **Push Integrations (WebPush)** (`server/src/notify/webpush.ts`)  
   _AC:_ VAPID keys, subscription endpoints, send pipeline; policy‑scoped payloads; unsub.

### D. Security & Supply Chain

10. **Threat Model & Fixes** (`SECURITY/threat-model.md`, `server/src/security/*`)  
    _AC:_ STRIDE analysis for collab & motifs; CSRF tokens; CSP headers; frameguard; SSRF/XXE audits.
11. **SBOM + SLSA** (`.github/workflows/slsa.yml`, `scripts/sbom.sh`)  
    _AC:_ Build SBOMs (CycloneDX) & provenance attestations for all services; publish with releases.

### E. Observability

12. **Notify Digest Metrics** (`server/src/metrics/notify_digest.ts`)  
    _AC:_ Build time, delivery time, failures, opt‑out; Grafana panels; alerts.
13. **Motif Job Heatmaps** (`helm/observability/dashboards/motif-heat.json`)  
    _AC:_ Heatmap per motif type; error budget; cache ratio.

---

## 3) Jira Subtasks CSV (import‑ready)

```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,Presence Scaling,"Heartbeat, batching, rate limits, health endpoints.",High,collab,web;server,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-06,IG-<parent>
Sub-task,IG,Threads GA & Moderation,"Edit windows, soft-delete, moderation, provenance export.",High,collab,web;server,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-07,IG-<parent>
Sub-task,IG,Mentions QoS & Directory,"Scoped directory, retries, opt-out.",High,collab,server;web,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-08,IG-<parent>
Sub-task,IG,Temporal Cascades,"2-hop cascades with explanations.",High,analytics,server,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-12,IG-<parent>
Sub-task,IG,Bridge Detectors,"Community bridges with overlay + explain.",High,analytics,server;web,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-13,IG-<parent>
Sub-task,IG,Alert Snooze,"Snooze/rate-limit + on-call windows.",Medium,analytics,server;web,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-13,IG-<parent>
Sub-task,IG,PWA Shell & Offline,"Manifest, service worker, offline banner.",High,mobile,web,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-09,IG-<parent>
Sub-task,IG,Mobile Tri‑Pane,"Responsive read-only tri-pane with alerts.",High,mobile,web,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-11,IG-<parent>
Sub-task,IG,WebPush,"VAPID, subscribe/unsub, send pipeline.",High,mobile,server,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-11,IG-<parent>
Sub-task,IG,Threat Model & Fix,"STRIDE, CSRF tokens, CSP, frameguard, SSRF/XXE audits.",High,security,server;web,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-10,IG-<parent>
Sub-task,IG,SBOM + SLSA,"CycloneDX SBOM + provenance attestations.",High,security,ops,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-15,IG-<parent>
Sub-task,IG,Notify Digest Metrics,"Digest build/delivery metrics, panels, alerts.",Medium,telemetry,ops,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-12,IG-<parent>
Sub-task,IG,Motif Heatmaps,"Per-motif heatmap, cache ratio, budgets.",Medium,telemetry,ops,,guy@intelgraph.dev,2026.01.r1,"Sprint 24 (Jan 5–16, 2026)",2026-01-12,IG-<parent>
```

---

## 4) Branching Plan

- Branch: `feature/collab-ga-motifs-v1-1-mobile`
- Integration branches: `feat/presence-scale`, `feat/threads-ga`, `feat/mentions-qos`, `feat/motif-cascades`, `feat/motif-bridges`, `feat/alerts-snooze`, `feat/pwa-shell`, `feat/mobile-tripane`, `feat/webpush`, `feat/threat-model`, `feat/sbom-slsa`, `feat/notify-digest-metrics`, `feat/motif-heatmaps`.

---

## 5) Architecture Delta (ASCII)

```text
PWA (Mobile) ← manifest + SW + WebPush
  │
  ▼
Tri‑pane (read‑only) & Alerts
  │
  ▼
Server
  ├─ case-space (presence scale, threads GA)
  ├─ notify (directory, digests, webpush)
  └─ analytics/motifs (cascades, bridges, snooze)
      │
      ▼
Prov‑Ledger (digest provenance, moderation logs)
Observability: digest metrics, motif heatmaps, WS latency; Security: CSRF, CSP, SBOM/SLSA
```

---

## 6) Code Scaffolding (drop‑in files)

### 6.1 Web — PWA manifest & SW

```json
// apps/web/public/manifest.json
{
  "name": "IntelGraph",
  "short_name": "IntelGraph",
  "display": "standalone",
  "start_url": "/mobile",
  "background_color": "#0b1220",
  "theme_color": "#0b1220",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```ts
// apps/web/src/pwa/sw.ts
self.addEventListener('install', (e: any) => {
  e.waitUntil(
    caches
      .open('ig-shell')
      .then((c) => c.addAll(['/', '/mobile', '/manifest.json'])),
  );
});
self.addEventListener('fetch', (e: any) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
```

### 6.2 Web — Mobile Tri‑Pane (read‑only)

```tsx
// apps/web/src/mobile/TriPaneMobile.tsx
import React, { useEffect } from 'react';
import $ from 'jquery';
export default function TriPaneMobile() {
  useEffect(() => {
    /* subscribe to WS alerts */
  }, []);
  return (
    <div className="p-2 grid grid-cols-1 gap-2">
      <div className="rounded-2xl shadow h-64">Graph preview</div>
      <div className="rounded-2xl shadow h-24">Timeline scrub</div>
      <div className="rounded-2xl shadow h-40">Map viewport</div>
    </div>
  );
}
```

### 6.3 Server — WebPush

```ts
// server/src/notify/webpush.ts
import webpush from 'web-push';
webpush.setVapidDetails(
  process.env.WEBPUSH_SUBJECT || 'mailto:ops@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);
export async function sendWebPush(sub: any, payload: any) {
  return webpush.sendNotification(sub, JSON.stringify(payload));
}
```

### 6.4 Motifs — Cascades & Bridges (skeletons)

```ts
// server/src/analytics/motifs/cascades.ts
export type Cascade = {
  chain: [string, string, string];
  windowDays: number;
  intensity: number;
  why: string;
};
export async function findCascades(
  events: any[],
  days: number,
): Promise<Cascade[]> {
  // placeholder implementation; replace with indexed scan + time windows
  const out: Cascade[] = [];
  return out;
}
```

```ts
// server/src/analytics/motifs/bridges.ts
export type Bridge = { node: string; score: number; why: string };
export async function findBridges(
  centrality: { node: string; bet: number; pr: number; community: string }[],
): Promise<Bridge[]> {
  return centrality
    .filter((c) => c.bet > 0.6 && c.pr < 0.2)
    .map((c) => ({
      node: c.node,
      score: c.bet - c.pr,
      why: 'high betweenness, low in‑community PR',
    }));
}
```

### 6.5 Security — CSRF & CSP

```ts
// server/src/security/headers.ts
import helmet from 'helmet';
import csurf from 'csurf';
export const securityMiddlewares = [
  helmet({
    frameguard: { action: 'deny' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'"],
        'connect-src': ["'self'", 'https://pushservice.example'],
      },
    },
  }),
  csurf({ cookie: true }),
];
```

### 6.6 SBOM + SLSA (scripts)

```bash
# scripts/sbom.sh
set -euo pipefail
which cyclonedx-npm >/dev/null || npm i -g @cyclonedx/cyclonedx-npm
cyclonedx-npm --output-file sbom-web.json apps/web
cyclonedx-npm --output-file sbom-server.json server
```

```yaml
# .github/workflows/slsa.yml
name: slsa
on: [push, release]
jobs:
  build-provenance:
    uses: slsa-framework/slsa-github-generator/.github/workflows/builder_slsa3.yml@v1.9.0
    with:
      artifact_path: dist
```

### 6.7 Observability — Digest Metrics

```ts
// server/src/metrics/notify_digest.ts
import client from 'prom-client';
export const digestBuild = new client.Histogram({
  name: 'notify_digest_build_ms',
  help: 'Digest build time',
  buckets: [50, 100, 200, 500, 1000, 2000],
});
export const digestDelivery = new client.Histogram({
  name: 'notify_digest_delivery_ms',
  help: 'Digest delivery time',
  buckets: [100, 200, 500, 1000, 2000, 5000],
});
export const digestFailures = new client.Counter({
  name: 'notify_digest_failures_total',
  help: 'Digest failures',
});
```

---

## 7) Tests & Quality Gates

- **Unit/Contract**: presence heartbeat & rate‑limit; fuzzy @directory; cascades/bridges scoring; WebPush subscribe/send; CSRF/CSP headers.
- **E2E (Playwright)**: threads GA flows with moderation; motif toggles incl. cascades/bridges; digest email/webpush delivery; PWA install & offline shell.
- **Perf (k6)**: 200 concurrent collab users (presence + comments + mentions); motifs job durations under limits; WebPush burst of 500 notifications.
- **Security**: CSRF tokens validated; CSP forbids inline eval; SBOMs generated and attached; SLSA provenance created.

---

## 8) CI/CD Deltas

```yaml
# .github/workflows/pwa-and-security.yml
name: pwa-and-security
on: [pull_request]
jobs:
  pwa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run -w apps/web build && npm run -w apps/web lint
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/sbom.sh
      - run: opa test SECURITY/policy/opa -v
```

---

## 9) Helm Values (S24)

```yaml
# helm/server/values.sprint24.yaml
mobile:
  pwa: true
notify:
  digests:
    daily: true
    weekly: true
security:
  csp: strict
  csrf: enabled
observability:
  wsLatencyPanels: true
  motifHeatmaps: true
```

---

## 10) Grafana — Motif Heatmaps & WS Latency

```json
{
  "title": "IntelGraph — Motifs & WS",
  "panels": [
    {
      "type": "heatmap",
      "title": "Motif Duration Heatmap",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(motif_job_duration_ms_bucket[10m])) by (le,type))"
        }
      ]
    },
    {
      "type": "graph",
      "title": "WS Event p95 (ms)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(ws_event_latency_ms_bucket[5m])) by (le,room))"
        }
      ]
    }
  ]
}
```

---

## 11) Demo Script (2 min)

1. Open busy Case Space (200 bots) → presence stable; p95 WS latency < 150ms panel.
2. Thread edit/delete with moderation; export case → provenance shows thread tombstones & redactions.
3. Enable **Cascades** & **Bridge** motifs → chips + explain cards; snooze one alert; show heatmap panels.
4. Install **PWA**, go offline → shell works; receive WebPush when back online; digest email preview shows policy‑scoped mentions.
5. Show SBOM/SLSA artifacts attached to release.

---

## 12) Risks & Mitigations

- **WS flood/backpressure** → batching + adaptive rate caps; alert on queue depth; region awareness.
- **PWA offline correctness** → cache versioning, stale‑while‑revalidate; feature flags for mobile.
- **Alert fatigue** → snooze, on‑call windows, per‑case thresholds.
- **Supply‑chain drift** → SBOM diff checks in CI; SLSA provenance verification before deploy.

---

## 13) Seeds for Sprint 08

- Mobile: limited write operations (notes, pins) with conflict resolution.
- Motifs: geo‑temporal clustering, influence cascades.
- Collab: @here/@channel, reactions, attachment previews & link unfurl.
- Security: mTLS for internal services, device posture signals for mobile access.
