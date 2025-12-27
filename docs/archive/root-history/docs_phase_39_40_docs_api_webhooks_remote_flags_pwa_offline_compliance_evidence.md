---
title: Docs Phase 39–40: Docs API & Webhooks, Remote Flags, PWA Offline & Compliance Evidence
summary: Expose a safe Docs API + webhooks, control features via remote flags, ship a PWA offline experience, and automate compliance evidence packs.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Integrate**: Public **Docs API** for search/meta/badges with rate‑limits and API keys.
- **React**: **Webhooks** for feedback, successes, and doc changes.
- **Control**: **Remote feature flags** to toggle beta widgets without redeploys.
- **Resiliency**: **PWA** with offline caching & installable experience.
- **Assure**: Automated **compliance evidence** packs for SOC2/ISO audits.

---

# Track A — Docs API (safe, limited)

## A1) OpenAPI spec (skeleton)

**`api/docs-api.yaml`**

```yaml
openapi: 3.0.3
info:
  title: IntelGraph Docs API
  version: 0.1.0
servers:
  - url: https://docs.api.intelgraph.example
paths:
  /v1/meta/pages:
    get:
      summary: List docs pages and metadata
      parameters:
        - in: query
          name: tag
          schema: { type: string }
      responses:
        '200':
          description: OK
  /v1/search:
    get:
      summary: Search the docs corpus
      parameters:
        - in: query
          name: q
          required: true
          schema: { type: string }
      responses:
        '200': { description: OK }
  /v1/badges/assertions:
    post:
      summary: Create a hosted OpenBadge assertion (admin only)
      responses: { '201': { description: Created } }
```

## A2) Minimal server (Node/Edge)

**`services/docs-api/server.js`**

```js
import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import fs from 'fs';
const app = express();
app.use(express.json());
const meta = JSON.parse(fs.readFileSync('docs/ops/meta/index.json', 'utf8'));
const API_KEYS = new Set(
  (process.env.DOCS_API_KEYS || '').split(',').filter(Boolean),
);
const auth = (req, res, next) => {
  const k = req.headers['x-api-key'];
  if (!k || !API_KEYS.has(k))
    return res.status(401).json({ error: 'unauthorized' });
  next();
};
app.use('/v1', rateLimit({ windowMs: 60_000, max: 120 }));
app.get('/v1/meta/pages', auth, (req, res) => {
  const tag = req.query.tag;
  let rows = meta;
  if (tag) rows = rows.filter((m) => (m.tags || []).includes(tag));
  res.json(
    rows.map(({ path, title, summary, owner, lastUpdated, tags }) => ({
      path,
      title,
      summary,
      owner,
      lastUpdated,
      tags,
    })),
  );
});
app.get('/v1/search', auth, (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const rows = meta
    .filter(
      (m) =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.summary || '').toLowerCase().includes(q),
    )
    .slice(0, 20);
  res.json(rows);
});
app.post('/v1/badges/assertions', auth, (req, res) => {
  res.status(201).json({ id: crypto.randomUUID() });
});
app.listen(process.env.PORT || 8787, () => console.log('Docs API up'));
```

## A3) CI: Build & publish container

**`.github/workflows/docs-api.yml`**

```yaml
name: Docs API Build
on: [push]
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - run: |
          docker build -t ghcr.io/${{ github.repository }}/docs-api:latest -f services/docs-api/Dockerfile .
          docker push ghcr.io/${{ github.repository }}/docs-api:latest
```

**`services/docs-api/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY services/docs-api/ ./
COPY docs/ops/meta/index.json /app/docs/ops/meta/index.json
RUN npm init -y && npm i express express-rate-limit
EXPOSE 8787
CMD ["node","server.js"]
```

**Acceptance**

- API serves `/v1/meta/pages` and `/v1/search` with API key; 429s beyond rate limit.

---

# Track B — Webhooks (events out)

## B1) Event types

- `docs.page.published` — when a page is added/updated on `main`.
- `docs.feedback.created` — from Feedback widget.
- `docs.success` — from TTA success events.

## B2) Delivery stub

**`scripts/webhooks/deliver.js`**

```js
import crypto from 'crypto';
import fs from 'fs';
const secret = process.env.DOCS_WEBHOOK_SECRET || 'dev';
export async function send(event, payload) {
  const body = JSON.stringify({ type: event, data: payload, ts: Date.now() });
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const url = process.env.DOCS_WEBHOOK_URL;
  if (!url) return console.warn('No DOCS_WEBHOOK_URL set');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-docs-signature': sig },
    body,
  });
  if (!res.ok) console.error('Webhook failed', res.status);
}
```

## B3) Trigger on publish

**`.github/workflows/docs-webhooks.yml`**

```yaml
name: Docs Webhooks
on:
  push:
    branches: [main]
    paths: ['docs/**']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node -e "const fs=require('fs');const g=JSON.parse(fs.readFileSync('docs/ops/meta/index.json'));console.log(JSON.stringify(g[g.length-1]||{},null,2))" > out.json
      - run: node -e "import('./scripts/webhooks/deliver.js').then(m=>m.send('docs.page.published', JSON.parse(require('fs').readFileSync('out.json'))))"
        env:
          DOCS_WEBHOOK_URL: ${{ secrets.DOCS_WEBHOOK_URL }}
          DOCS_WEBHOOK_SECRET: ${{ secrets.DOCS_WEBHOOK_SECRET }}
```

**Acceptance**

- Webhooks POST to configured endpoint with HMAC signature; consumer verifies.

---

# Track C — Remote Feature Flags

## C1) Flags file

**`docs/ops/flags.json`**

```json
{
  "assistant": { "enabled": true, "rollout": 0.5 },
  "playground": { "enabled": true },
  "smartSearch": { "enabled": false }
}
```

## C2) Hook flags in UI

**`src/components/Flags.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
const Ctx = createContext<{ flags: any }>({ flags: {} });
export function FlagsProvider({ children }: { children: any }) {
  const [flags, setFlags] = useState<any>({});
  useEffect(() => {
    fetch('/ops/flags.json')
      .then((r) => r.json())
      .then(setFlags)
      .catch(() => setFlags({}));
  }, []);
  return <Ctx.Provider value={{ flags }}>{children}</Ctx.Provider>;
}
export function useFlag(name: string) {
  const { flags } = useContext(Ctx);
  return !!flags?.[name]?.enabled;
}
```

**`src/theme/Root.tsx`**

```tsx
import React from 'react';
import { FlagsProvider } from '@site/src/components/Flags';
export default function Root({ children }) {
  return <FlagsProvider>{children}</FlagsProvider>;
}
```

**Usage in MDX**

```mdx
import { useFlag } from '@site/src/components/Flags';

{useFlag('assistant') && <>**Beta:** Assistant enabled for 50%.</>}
```

**Acceptance**

- Toggling `flags.json` flips features without rebuild.

---

# Track D — PWA Offline & Install

## D1) Web app manifest

**`docs-site/static/manifest.webmanifest`**

```json
{
  "name": "IntelGraph Docs",
  "short_name": "Docs",
  "start_url": "/",
  "display": "standalone",
  "icons": [
    { "src": "/img/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/img/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## D2) Service worker with Workbox

**`docs-site/sw.js`**

```js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST || []);
registerRoute(
  ({ request }) => request.destination === 'document',
  new StaleWhileRevalidate(),
);
registerRoute(
  ({ url }) => url.pathname.startsWith('/assets/'),
  new StaleWhileRevalidate(),
);
```

**`docusaurus.config.js`** (Workbox plugin or custom inject)

```js
pwa: {
  swCustom: 'sw.js',
  manifest: 'manifest.webmanifest',
}
```

**Acceptance**

- Site installable; returns cached pages offline; respects updates.

---

# Track E — Compliance Evidence Packs

## E1) Controls mapping & evidence catalog

**`docs/trust/controls-map.md`**

```md
---
title: Controls Mapping (Docs)
summary: SOC2/ISO controls with evidence pointers.
owner: security
---

- **Change Management**: PR reviews, docs-policy CI → evidence: `artifacts/change/`.
- **Availability**: Synthetics + uptime → evidence: `artifacts/uptime/`.
- **Security**: SSO/Audit logs → evidence: `artifacts/audit/`.
```

## E2) Evidence collector

**`scripts/trust/collect-evidence.js`**

```js
import fs from 'fs';
import path from 'path';
const items = [
  { src: 'docs/ops/tta/summary.json', dest: 'artifacts/metrics/tta.json' },
  { src: 'docs/ops/audit/weekly.json', dest: 'artifacts/audit/weekly.json' },
  { src: 'docs/ops/warehouse/kpis.csv', dest: 'artifacts/metrics/kpis.csv' },
  {
    src: '.github/workflows/docs-policy.yml',
    dest: 'artifacts/controls/policy-workflow.yml',
  },
];
for (const it of items) {
  if (fs.existsSync(it.src)) {
    const out = path.join('artifacts', it.dest.split('/').slice(1).join('/'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(it.src, out);
  }
}
console.log('Evidence collected');
```

## E3) Evidence pack workflow

**`.github/workflows/trust-evidence.yml`**

```yaml
name: Trust Evidence Pack
on:
  schedule: [{ cron: '0 6 * * 1' }]
  workflow_dispatch:
jobs:
  pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/trust/collect-evidence.js
      - run: zip -r evidence-pack.zip artifacts
      - uses: actions/upload-artifact@v4
        with: { name: evidence-pack, path: evidence-pack.zip }
```

**Acceptance**

- Weekly artifact `evidence-pack.zip` uploaded with metrics, audits, and controls.

---

# Execution Plan (4–6 days)

1. Stand up **Docs API** (meta/search) behind API keys; publish container.
2. Enable **webhooks** on `main` publishes; document signature verify.
3. Wire **remote flags** and toggle Assistant/SmartSearch safely.
4. Ship **PWA** manifest + SW for offline browsing.
5. Schedule **evidence pack** generation and link from Trust Center.

---

# Acceptance Criteria

- Docs API returns results with key + rate‑limits; container published to GHCR.
- Webhooks deliver signed events to a test endpoint on publish.
- Changing `flags.json` flips features instantly without a rebuild.
- Docs are installable (PWA) and work offline for recently visited pages.
- Weekly **evidence pack** artifact produced and referenced in Trust Center.
