````markdown
# IntelGraph — New‑Year Stability & Federation Sprint (v1.2.0)

**Slug:** `sprint-2026-01-05-intelgraph-v1-2`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-01-05 → 2026-01-16 (10 business days)  
**Theme:** **Federation, Privacy & Mobile Read‑Only** — cross‑org graph federation (query + share), purpose‑binding privacy, and a lightweight mobile read‑only UI; plus stability hardening.

---

## 0) North Stars & DoD

- **Trust‑preserving Federation:** Query across org graphs via gateways with **purpose‑binding** and **policy filtering**; no raw PII leaves the source without explicit grant.
- **Least Privilege by Default:** Purpose + time‑bound access tokens enforced at resolver level; exports tagged with purpose and expiry.
- **Mobile Clarity:** Read‑only mobile view for cases, insights, and graph snapshots with quick filters and provenance.
- **Stability:** Crash‑free sessions ≥ 99.9%; p95 cross‑org query < 1.3s on demo federated set; zero Sev‑1.

**DoD Gate:**

1. Demo: Org‑A & Org‑B share a **federated lens** → cross‑org NL→Cypher returns policy‑filtered results with source attributions.
2. Mobile (read‑only PWA) loads case summary, insight feed, and graph snapshot; taps open provenance.
3. Purpose‑bound tokens expire on schedule; blocked attempts show clear reasons; audit covers grants/uses/denials.
4. Soak & chaos pass; error budgets healthy; dashboards show cross‑org latencies.

---

## 1) Epics → Objectives

1. **Federated Graph Gateway (FED‑E1)** — Query planner, policy filter, join hints, and source attribution; per‑org connectors.
2. **Purpose‑Binding & Expiring Grants (PRV‑E2)** — Purpose strings + TTL on tokens; ABAC checks; export tagging.
3. **Mobile Read‑Only (MOB‑E3)** — PWA shell with Case/Insights/Snapshot; jQuery interactions; offline cache for snapshots.
4. **Stability Hardening (REL‑E4)** — Memory/CPU guards, circuit breakers, timeouts, and soak/chaos playbooks.
5. **Docs & Success (DOC‑E5)** — Federation setup guide, privacy model, mobile quickstart, and SRE runbooks.

---

## 2) Swimlanes

### Frontend (React + MUI + Cytoscape.js + jQuery)

- **Federated lens selector**; result chips showing source org & policy state.
- **Mobile PWA** (read‑only): Case summary, Insight feed, Graph snapshot viewer; install prompt; local cache of latest snapshots.
- jQuery shortcuts for filter chips, purpose tooltips, and provenance popovers.

### Backend (Node/Express + Apollo + Neo4j + Redis)

- **Federation gateway**: sub‑queries routed to per‑org endpoints; result union + policy filter; optional anonymization.
- **Purpose‑bound tokens**: short‑lived JWT with `purpose`, `scope`, `expiry`; resolvers enforce; exports tagged.
- **Snapshot CDN**: signed URLs for graph snapshot tiles; cache headers and invalidation hooks.

### Ops/SRE & Security

- Circuit breakers & timeouts for cross‑org calls; backoff/jitter; red metrics.
- Grafana dashboards: cross‑org p95/99, breaker trips, token grant/deny, mobile cache hit rate.
- Soak tests (8h) and chaos (link cuts, latency spikes) with runbooks.

### QA/Docs

- Multi‑org E2E tests, purpose‑bounded access tests, mobile PWA checks, federation guide and privacy docs.

---

## 3) Sprint Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ 88 pts

### Federation (34 pts)

1. Federation gateway query planner + fan‑out.  
   **AC:** NL→Cypher split into org‑local queries; union + dedupe; source chip annotations. (**XL**)
2. Policy filter & anonymization.  
   **AC:** Fields removed/masked per policy; provenance preserved; denial reasons surfaced. (**L**)
3. Federated lens CRUD & sharing.  
   **AC:** Define which entities/relations & policies participate; share to roles; audit changes. (**L**)

### Purpose‑Binding (20 pts)

4. Purpose‑bound JWTs + resolver guard.  
   **AC:** `purpose`, `scope`, `exp` enforced; denial reason logged; tests cover matrix. (**L**)
5. Export purpose tagging + expiry.  
   **AC:** Bundles carry purpose/expiry; verifier warns on stale export; UI badges. (**M**)

### Mobile Read‑Only (22 pts)

6. PWA shell (installable) + offline cache of snapshots.  
   **AC:** Lighthouse PWA ≥ 90; works offline for last 5 snapshots. (**L**)
7. Case/Insight/Snapshot views w/ provenance.  
   **AC:** Responsive; tap opens source details; no edits allowed; jQuery interactions; a11y AA+. (**L**)

### Stability (8 pts)

8. Circuit breakers & timeouts for federation calls.  
   **AC:** Breaker trips at p95>2s; fallback messaging; metrics & alerts. (**M**)

### QA/Docs (4 pts)

9. Multi‑org E2E + mobile tests + guides.  
   **AC:** CI gating; docs published; screenshots recorded. (**S**)

---

## 4) Scaffolds & Code

### 4.1 Federation Gateway — Planner & Fan‑out

```ts
// server/src/federation/gateway.ts
import pLimit from 'p-limit';
import { planFederated } from './planner';
import { applyPolicy } from './policy';

export async function federatedQuery(ctx, nlQuery: string) {
  const plan = await planFederated(nlQuery, ctx);
  const limit = pLimit(4);
  const results = await Promise.all(
    plan.subqueries.map((sq) => limit(() => runOrgQuery(ctx, sq))),
  );
  const merged = mergeAndDedupe(results);
  return merged.map((r) => applyPolicy(ctx, r));
}
```
````

### 4.2 Planner (NL→Cypher split by org)

```ts
// server/src/federation/planner.ts
export async function planFederated(nlQuery: string, ctx: any) {
  // Use existing NL→Cypher, then pattern‑match labels to org routing tables
  const cy = await ctx.nl2cypher(nlQuery);
  const targets = await pickTargets(cy);
  return {
    cypher: cy,
    subqueries: targets.map((t) => ({
      org: t.org,
      cypher: constrainToOrg(cy, t),
    })),
  };
}
```

### 4.3 Policy Filtering & Field Anonymization

```ts
// server/src/federation/policy.ts
export function applyPolicy(ctx: any, row: any) {
  const user = ctx.user;
  for (const f of Object.keys(row)) {
    if (shouldMask(user, f)) row[f] = '•••';
  }
  row.__source = row.__source || ctx.currentOrg;
  return row;
}
function shouldMask(user: any, field: string) {
  // purpose + role + field sensitivity
  if (user.purpose !== 'investigation:case') return true;
  const sensitive = ['biometric', 'geo.precise', 'minor.identifier'];
  return sensitive.includes(field) && !user.scopes.includes('view:sensitive');
}
```

### 4.4 Purpose‑Bound Tokens (JWT)

```ts
// server/src/security/purpose-token.ts
import jwt from 'jsonwebtoken';
export function issuePurposeToken(
  user: any,
  purpose: string,
  scopes: string[],
  ttlSec: number,
) {
  return jwt.sign({ sub: user.id, purpose, scopes }, process.env.JWT_SECRET!, {
    expiresIn: ttlSec,
  });
}
export function guardPurpose(ctx: any, scope: string) {
  if (!ctx.token?.scopes?.includes(scope)) throw new Error('ScopeDenied');
  if (!ctx.token?.purpose) throw new Error('PurposeMissing');
}
```

### 4.5 Export Tagging

```ts
// server/src/provenance/export-tags.ts
export function tagExport(bundle: any, token: any) {
  bundle.meta.purpose = token.purpose;
  bundle.meta.expiresAt = token.exp
    ? new Date(token.exp * 1000).toISOString()
    : null;
  return bundle;
}
```

### 4.6 Mobile PWA Shell (React + jQuery hooks)

```tsx
// apps/mobile/src/App.tsx
import React from 'react';
export default function App() {
  return (
    <div className="p-4">
      <header className="text-xl font-bold">IntelGraph Mobile</header>
      <nav className="mt-2 flex gap-2">
        <a href="#/cases">Cases</a>
        <a href="#/insights">Insights</a>
        <a href="#/snapshots">Snapshots</a>
      </nav>
      <main id="view" className="mt-4" />
    </div>
  );
}
```

```js
// apps/mobile/public/pwa-sw.js
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('ig-snapshots-v1').then((c) => c.addAll(['/offline.html'])),
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/snapshots/')) {
    e.respondWith(
      caches.match(e.request).then(
        (r) =>
          r ||
          fetch(e.request).then((res) => {
            const cc = res.clone();
            caches.open('ig-snapshots-v1').then((c) => c.put(e.request, cc));
            return res;
          }),
      ),
    );
  }
});
```

```js
// apps/mobile/src/jquery-hooks.js
$(function () {
  $(document).on('click', '.insight-card', function () {
    const id = $(this).data('id');
    $('#view').load(`/mobile/insight/${id}`);
  });
});
```

### 4.7 Snapshot CDN — Signed URLs

```ts
// server/src/snapshots/cdn.ts
import crypto from 'crypto';
export function signedUrl(id: string) {
  const exp = Math.floor(Date.now() / 1000) + 300;
  const sig = crypto
    .createHmac('sha256', process.env.CDN_SECRET!)
    .update(`${id}.${exp}`)
    .digest('hex');
  return `/snapshots/${id}?exp=${exp}&sig=${sig}`;
}
export function verifySig(id: string, exp: number, sig: string) {
  if (Date.now() / 1000 > exp) return false;
  const good = crypto
    .createHmac('sha256', process.env.CDN_SECRET!)
    .update(`${id}.${exp}`)
    .digest('hex');
  return sig === good;
}
```

### 4.8 Circuit Breaker (federation calls)

```ts
// server/src/federation/breaker.ts
export class Breaker {
  constructor(
    private threshold = 5,
    private timeoutMs = 10_000,
  ) {}
  fails = 0;
  openUntil = 0;
  async call(fn: () => Promise<any>) {
    const now = Date.now();
    if (now < this.openUntil) throw new Error('CircuitOpen');
    try {
      const r = await fn();
      this.fails = 0;
      return r;
    } catch (e) {
      this.fails++;
      if (this.fails >= this.threshold) {
        this.openUntil = now + this.timeoutMs;
      }
      throw e;
    }
  }
}
```

### 4.9 E2E (Multi‑org) & Mobile Tests

```ts
// tests/e2e/federation.spec.ts
import { test, expect } from '@playwright/test';

test('cross‑org query shows source chips and masked fields', async ({
  page,
}) => {
  await page.goto('/lens/cross‑org‑1');
  await page.fill(
    '#nl',
    'find payments between org A vendors and org B shell corps last year',
  );
  await page.click('#run');
  await expect(page.locator('.chip.source-org')).toHaveCount(2);
  await expect(page.getByText('•••')).toBeVisible();
});
```

```ts
// tests/e2e/mobile.spec.ts
import { test, expect } from '@playwright/test';

test('mobile shows insights & snapshots offline', async ({ page }) => {
  await page.goto('/mobile');
  await page.addInitScript(() =>
    navigator.serviceWorker.register('/pwa-sw.js'),
  );
  await page.click('text=Snapshots');
  await page.reload({ waitUntil: 'networkidle' });
  // simulate offline
  await page.context().setOffline(true);
  await page.click('text=Snapshots');
  await expect(page.locator('#view .snapshot')).toBeVisible();
});
```

### 4.10 k6 — Cross‑org Soak

```js
import http from 'k6/http';
export const options = {
  vus: 50,
  duration: '8h',
  thresholds: { http_req_duration: ['p(95)<1300'] },
};
export default function () {
  http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({
      query: '{ federatedSearch(q:"fraud rings last quarter"){ __source id } }',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
```

---

## 5) Delivery Timeline

- **D1–D2:** Planner + fan‑out; purpose‑tokens scaffolds; lens CRUD.
- **D3–D4:** Policy filter/anonymize; circuit breakers/timeouts; signed snapshot URLs.
- **D5–D6:** Mobile PWA shell + views; offline snapshot cache; a11y.
- **D7:** E2E multi‑org + mobile tests; soak/chaos configs; Grafana panels.
- **D8–D10:** Hardening, docs, SRE playbooks, final demo polish.

---

## 6) Risks & Mitigations

- **Policy bypass risk** → deny‑by‑default filters; unit/contract tests; shadow logs.
- **Cross‑org latency** → parallel fan‑out, caching, circuit breakers, partial results UI.
- **Mobile cache staleness** → TTLs, manual refresh, badge for stale.
- **Purpose creep** → explicit purposes, expiries, audits, and appeal process.

---

## 7) Metrics

- Cross‑org p95/p99; breaker trips; masked field counts; token issuance/denial; mobile cache hit; crash‑free sessions; soak error rates.

---

## 8) Release Artifacts

- **ADR‑024:** Federation planner & policy filter.
- **ADR‑025:** Purpose‑binding model & resolver enforcement.
- **RFC‑027:** Mobile read‑only PWA scope and UX.
- **Runbooks:** Circuit breaker ops; partial‑results incidents; mobile cache purge.
- **Docs:** Federation setup; privacy model; mobile quickstart.

---

## 9) Definition of Ready

- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---

## 10) Demo Script (15 min)

1. Create a **federated lens** across Org‑A & Org‑B with policy filters; run NL→Cypher; show source chips and masked fields.
2. Issue purpose‑bound token; attempt action after expiry → get reasoned denial; export shows purpose/expiry tags.
3. Open mobile PWA; browse case, insights, and snapshots; toggle airplane mode → offline snapshot still loads with provenance.
4. Review Grafana: cross‑org p95, breaker trips, token denials; conclude with stability metrics.

---

## 11) Out‑of‑Scope (backlog)

- Write‑through cross‑org updates; zero‑knowledge proofs; per‑edge purpose constraints; full offline authoring.

```

```
