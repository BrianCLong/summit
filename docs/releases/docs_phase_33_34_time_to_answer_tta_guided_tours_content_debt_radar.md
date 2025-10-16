---
title: Docs Phase 33–34: Time‑to‑Answer (TTA), Guided Tours & Content Debt Radar
summary: Instrument a true Time‑to‑Answer metric, add role‑aware guided tours, and auto‑prioritize doc debt from live signals into actionable issues.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Measure**: Ship a durable **TTA** (Time‑to‑Answer) metric from search → click → success.
- **Guide**: Role‑aware **Guided Tours** that highlight the exact controls and pages to complete common jobs.
- **Prioritize**: A **Content Debt Radar** that merges TTA, zero‑results, stale, a11y, and broken‑link signals into ranked backlog issues.

---

# Track A — Time‑to‑Answer (TTA) Pipeline

## A1) Client events (search → click → success)

**`docs-site/static/tta.js`**

```js
(function () {
  const post = (ev, attrs) =>
    navigator.sendBeacon?.(
      '/telemetry',
      JSON.stringify({ ev, ts: Date.now(), attrs }),
    );
  const now = () => performance.now();
  // 1) Search start
  let t0 = 0;
  document.addEventListener(
    'input',
    (e) => {
      if (
        e.target &&
        e.target.matches('input[type="search"], .DocSearch-Input')
      ) {
        if (!t0) t0 = now();
        post('search_input', { qlen: (e.target.value || '').length });
      }
    },
    true,
  );
  // 2) Doc click (candidate answer)
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target?.closest && e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (/^https?:\/\//.test(href)) return;
      post('doc_click', { href, dt: t0 ? Math.round(now() - t0) : null });
    },
    true,
  );
  // 3) Success signal: any element with [data-tta-success]
  window.addEventListener('load', () => {
    document.querySelectorAll('[data-tta-success]').forEach((el) => {
      el.addEventListener('click', () => {
        post('doc_success', {
          path: location.pathname,
          tta_ms: t0 ? Math.round(now() - t0) : null,
        });
        t0 = 0;
      });
    });
  });
})();
```

**Usage** in MDX to add an explicit success action:

```mdx
<button className="button button--primary" data-tta-success>
  ✅ I found what I needed
</button>
```

**`docusaurus.config.js`** (inject script)

```js
scripts: [{ src: '/tta.js', async: true }];
```

## A2) Serverless collector (edge stub)

**`scripts/tta/collector.js`**

```js
// Minimal collector: append NDJSON lines to docs/ops/tta/log.ndjson (CI or dev preview only)
const fs = require('fs');
const path = require('path');
exports.handle = async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const safe = { ev: body.ev, ts: Date.now(), attrs: body.attrs };
    fs.mkdirSync('docs/ops/tta', { recursive: true });
    fs.appendFileSync('docs/ops/tta/log.ndjson', JSON.stringify(safe) + '\n');
    res.writeHead(204).end();
  } catch {
    res.writeHead(204).end();
  }
};
```

> In production, route `/telemetry` to your preferred collector (no PII; truncate paths as needed).

## A3) Daily TTA aggregation

**`scripts/tta/aggregate.js`**

```js
const fs = require('fs');
const path = require('path');
const byDay = {};
if (!fs.existsSync('docs/ops/tta/log.ndjson')) process.exit(0);
fs.readFileSync('docs/ops/tta/log.ndjson', 'utf8')
  .trim()
  .split(/\n/)
  .forEach((line) => {
    if (!line) return;
    const r = JSON.parse(line);
    const day = new Date(r.ts).toISOString().slice(0, 10);
    byDay[day] ||= { searches: 0, clicks: 0, successes: 0, tta_ms: [] };
    if (r.ev === 'search_input') byDay[day].searches++;
    if (r.ev === 'doc_click') byDay[day].clicks++;
    if (r.ev === 'doc_success' && r.attrs?.tta_ms) {
      byDay[day].successes++;
      byDay[day].tta_ms.push(r.attrs.tta_ms);
    }
  });
const out = Object.entries(byDay).map(([d, v]) => ({
  date: d,
  searches: v.searches,
  clicks: v.clicks,
  successes: v.successes,
  tta_p50: p(v.tta_ms, 0.5),
  tta_p90: p(v.tta_ms, 0.9),
}));
function p(arr, q) {
  if (!arr.length) return null;
  const a = [...arr].sort((a, b) => a - b);
  const i = Math.max(0, Math.min(a.length - 1, Math.floor(q * (a.length - 1))));
  return a[i];
}
fs.mkdirSync('docs/ops/tta', { recursive: true });
fs.writeFileSync('docs/ops/tta/summary.json', JSON.stringify(out, null, 2));
```

**`.github/workflows/docs-tta.yml`**

```yaml
name: Docs TTA Aggregation
on:
  schedule: [{ cron: '0 2 * * *' }]
  workflow_dispatch:
jobs:
  tta:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/tta/aggregate.js
      - uses: actions/upload-artifact@v4
        with: { name: tta-summary, path: docs/ops/tta/summary.json }
```

## A4) Dashboard card

**`src/components/TtaCard.tsx`**

```tsx
import React from 'react';
export default function TtaCard() {
  const data = require('@site/docs/ops/tta/summary.json');
  if (!data?.length) return null;
  const last = data[data.length - 1];
  return (
    <div className="card padding--md">
      <strong>Median Time‑to‑Answer:</strong>{' '}
      {last.tta_p50 ? `${Math.round(last.tta_p50 / 1000)}s` : '–'} •{' '}
      <em>P90:</em> {last.tta_p90 ? `${Math.round(last.tta_p90 / 1000)}s` : '–'}
    </div>
  );
}
```

---

# Track B — Guided Tours (role‑aware)

## B1) Tour component

**`src/components/Tour.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
const stepsAttr = 'data-tour-step';
export default function Tour({
  id,
  role,
  steps,
}: {
  id: string;
  role?: string;
  steps: { selector: string; title: string; body: string }[];
}) {
  const key = `tour:${id}:${role || 'all'}`;
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(key)) setOpen(true);
  }, [key]);
  useEffect(() => {
    if (!open) return;
    const step = steps[i];
    const el = step && document.querySelector(step.selector);
    if (el) el.setAttribute(stepsAttr, '1');
    return () => {
      if (el) el.removeAttribute(stepsAttr);
    };
  }, [open, i, steps]);
  if (!open)
    return (
      <button className="button button--sm" onClick={() => setOpen(true)}>
        Start tour
      </button>
    );
  const s = steps[i];
  return (
    <div className="tour">
      <div className="tour-panel">
        <h4>{s?.title}</h4>
        <p>{s?.body}</p>
        <div className="flex gap-2">
          <button
            className="button button--sm"
            onClick={() => setI(Math.max(0, i - 1))}
            disabled={i === 0}
          >
            Back
          </button>
          <button
            className="button button--sm button--primary"
            onClick={() =>
              i < steps.length - 1
                ? setI(i + 1)
                : (localStorage.setItem(key, 'done'), setOpen(false))
            }
          >
            {i < steps.length - 1 ? 'Next' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**`src/css/tour.css`**

```css
[data-tour-step] {
  outline: 3px solid #0ea5e9;
  outline-offset: 2px;
  border-radius: 8px;
}
.tour {
  position: fixed;
  right: 16px;
  bottom: 16px;
  max-width: 360px;
  z-index: 9999;
}
.tour-panel {
  background: white;
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}
```

**Usage** in MDX (role‑aware via your existing role preference):

```mdx
import Tour from '@site/src/components/Tour';

<Tour
  id="user-quickstart"
  role="user"
  steps={[
    {
      selector: 'a[href="/get-started/quickstart-5-min"]',
      title: 'Start here',
      body: 'Begin with the 5‑minute quickstart.',
    },
    {
      selector: 'a[href="/reference/"]',
      title: 'Reference',
      body: 'Keep this tab open for API details.',
    },
  ]}
/>
```

**Acceptance**

- Tour highlights DOM targets; persists completion per role; A11y: focusable panel & buttons.

---

# Track C — Content Debt Radar (ranked backlog)

## C1) Merge signals → scores

**`scripts/docs/debt-radar.js`**

```js
const fs = require('fs');
function safe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return [];
  }
}
const stale = safe('docs-stale-report.json'); // from existing sweep
const a11y = safe('docs/ops/telemetry/build.json');
const tta = safe('docs/ops/tta/summary.json');
const zeros = safe('docs/search-queries.json'); // produce via Algolia API job
const broken = Number(process.env.LINK_FAILS || 0);
const latestTta = tta[tta.length - 1] || {};
function score(page) {
  const isStale = stale.includes(page) ? 1 : 0;
  const zr = zeros.find?.((z) => z.page === page)?.count || 0;
  const s =
    isStale * 2 +
    (zr > 0 ? 1 : 0) +
    (latestTta.tta_p90 > 60000 ? 1 : 0) +
    (broken > 0 ? 1 : 0);
  return s;
}
// naive: rank stale pages by score
const ranked = (stale || [])
  .map((p) => ({ page: p, score: score(p) }))
  .sort((a, b) => b.score - a.score);
fs.writeFileSync('docs/ops/debt-radar.json', JSON.stringify(ranked, null, 2));
```

## C2) Weekly issue creation

**`.github/workflows/docs-debt-radar.yml`**

```yaml
name: Docs Debt Radar
on:
  schedule: [{ cron: '0 12 * * 1' }]
  workflow_dispatch:
jobs:
  rank:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/docs/debt-radar.js
      - uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs')
            const items = JSON.parse(fs.readFileSync('docs/ops/debt-radar.json','utf8')).slice(0,10)
            if (!items.length) return
            const body = items.map(i=>`- [ ] ${i.page} (score ${i.score})`).join('\n')
            await github.rest.issues.create({ ...context.repo, title: `Docs Debt Radar — Top 10`, body, labels: ['docs','docs-debt','priority'] })
```

**Acceptance**

- Ranked debt report produced weekly; issue opened with top 10.

---

# Track D — UX Polish for Success Signals

## D1) Inline “Did this help?” → success

Wire the existing Feedback widget to trigger `data-tta-success` when users upvote.

**Patch** `src/components/Feedback.tsx` (excerpt)

```tsx
<button
  onClick={() => {
    setV('up');
    const el = document.querySelector('[data-tta-success]') as HTMLElement;
    el?.click();
  }}
  className="button button--sm"
>
  👍
</button>
```

## D2) Copy buttons emit success

Add `data-tta-success` to critical copy buttons on quickstarts/how‑tos.

---

# Execution Plan (3–4 days)

1. Inject **tta.js** and land the **collector** stub; enable daily **aggregation** + dashboard card.
2. Add **Guided Tour** component and wire one tour to the Quickstart + Reference.
3. Ship **Debt Radar** script + weekly issue workflow.
4. Connect Feedback upvote → TTA success; add `data-tta-success` to top pages.

---

# Acceptance Criteria

- `docs/ops/tta/summary.json` populated with median & P90 values; dashboard card shows latest.
- One **Guided Tour** live and persists completion by role.
- **Debt Radar** issue opens weekly with a ranked top‑10.
- Upvotes and key copy actions register as **success** events contributing to TTA.
