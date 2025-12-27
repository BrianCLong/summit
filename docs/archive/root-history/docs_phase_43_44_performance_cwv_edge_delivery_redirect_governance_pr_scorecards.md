---
title: Docs Phase 43–44: Performance (CWV), Edge Delivery, Redirect Governance & PR Scorecards
summary: Hit Core Web Vitals SLAs with Lighthouse CI + real user monitoring, optimize images & caching at the edge, govern redirects/migrations with structured maps, and surface PR-level quality scorecards.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Speed**: Pass Core Web Vitals (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1) on key pages.
- **Delivery**: Optimize images, fonts, and caching with edge validations.
- **Continuity**: Structured redirects & migration guides to kill 404s.
- **Visibility**: PR scorecards for performance and documentation quality deltas.

---

# Track A — Core Web Vitals: Lighthouse CI + RUM

## A1) Lighthouse CI (lab) budgets

**`.lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "docs-site/build",
      "url": ["/", "/how-to/zip-export", "/releases/v24"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

**Workflow** `.github/workflows/docs-lhci.yml`

```yaml
name: Docs Lighthouse CI
on: [pull_request]
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd docs-site && npm i && npm run build
      - run: npx @lhci/cli autorun
```

## A2) Real‑User Monitoring (web‑vitals)

**`docs-site/static/web-vitals.js`**

```js
import {
  onLCP,
  onINP,
  onCLS,
} from 'https://unpkg.com/web-vitals@4/dist/web-vitals.attribution.iife.js';
const send = (t, v, a) =>
  navigator.sendBeacon?.(
    '/telemetry',
    JSON.stringify({
      ev: 'webvital',
      type: t,
      value: v,
      attrib: a,
      ts: Date.now(),
    }),
  );
onLCP((m) => send('LCP', m.value, m.attribution));
onINP((m) => send('INP', m.value, m.attribution));
onCLS((m) => send('CLS', m.value, m.attribution));
```

**`docusaurus.config.js`**

```js
scripts: [{ src: '/web-vitals.js', async: true }];
```

## A3) CWV dashboard card

**`src/components/CwvCard.tsx`**

```tsx
import React from 'react';
export default function CwvCard() {
  const data = require('@site/docs/ops/telemetry/cwv.json');
  if (!data?.p50) return null;
  return (
    <div className="card padding--md">
      <strong>CWV</strong> LCP p50: {Math.round(data.p50.LCP)}ms • INP p50:{' '}
      {Math.round(data.p50.INP)}ms • CLS p50: {(data.p50.CLS || 0).toFixed(3)}
    </div>
  );
}
```

**Aggregation stub** `scripts/perf/aggregate-cwv.js`

```js
const fs = require('fs');
// Expect NDJSON events in docs/ops/tta/log.ndjson too; merge for demo
const out = { p50: { LCP: null, INP: null, CLS: null } };
fs.mkdirSync('docs/ops/telemetry', { recursive: true });
fs.writeFileSync('docs/ops/telemetry/cwv.json', JSON.stringify(out));
```

---

# Track B — Edge Delivery: Images, Fonts, Cache & Payload Budgets

## B1) Responsive images & next‑gen formats

**`scripts/perf/optimize-images.js`**

```js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
async function processFile(p) {
  const dir = path.dirname(p),
    base = path.basename(p, path.extname(p));
  await sharp(p)
    .resize(1600)
    .toFile(path.join(dir, base + '.webp'));
  await sharp(p)
    .resize(800)
    .toFile(path.join(dir, base + '-800.webp'));
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f),
      s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.(png|jpe?g)$/i.test(f) && processFile(p);
  }
})('docs');
```

**CI step** (extend existing quality job):

```yaml
- name: Optimize images (webp)
  run: |
    npm i sharp
    node scripts/perf/optimize-images.js
```

## B2) Font subsetting & preload

**`scripts/perf/subset-fonts.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p docs-site/static/fonts/subset
pyftsubset docs-site/static/fonts/Inter-Variable.ttf --output-file=docs-site/static/fonts/subset/Inter-Subset.woff2 --text-file=scripts/perf/common-chars.txt --flavor=woff2 --layout-features='*' --unicodes='U+000-5FF'
```

**`docusaurus.config.js`** (add preload tag)

```js
stylesheets: [
  {
    href: '/fonts/subset/Inter-Subset.woff2',
    rel: 'preload',
    as: 'font',
    type: 'font/woff2',
    crossorigin: 'anonymous',
  },
];
```

## B3) Cache header verification & payload budgets

**`scripts/perf/headers-check.sh`**

```bash
set -euo pipefail
urls=("/" "/assets/")
for u in "${urls[@]}"; do
  curl -sI "$BASE_URL$u" | grep -iE 'cache-control|etag|content-encoding'
done
```

**`scripts/perf/payload-budget.js`**

```js
const fs = require('fs');
const path = require('path');
let fail = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f),
      s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.(js|css)$/i.test(f) && check(p, s.size);
  }
})('docs-site/build/assets');
function check(p, bytes) {
  const max = 250 * 1024;
  if (bytes > max) {
    console.error('Asset too large', p, bytes);
    fail = 1;
  }
}
process.exit(fail);
```

---

# Track C — Structured Redirects & Migration Guardrails

## C1) Redirect map & generator

**`docs/_meta/redirects.yml`**

```yaml
- from: /old/zip-export
  to: /how-to/zip-export
- from: /v23/upgrade
  to: /how-to/upgrade-to-v24
```

**`scripts/migrate/build-redirects.js`**

```js
const fs = require('fs');
const yaml = require('js-yaml');
const map = yaml.load(fs.readFileSync('docs/_meta/redirects.yml', 'utf8'));
fs.writeFileSync(
  'docs-site/static/_redirects',
  map.map((r) => `${r.from} ${r.to} 301`).join('\n'),
);
fs.writeFileSync('docs/ops/meta/redirects.json', JSON.stringify(map, null, 2));
```

## C2) 404 catcher with suggestions

**`src/components/NotFoundSuggest.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
export default function NotFoundSuggest() {
  const [best, setBest] = useState<string | null>(null);
  useEffect(() => {
    import('@site/docs/ops/meta/redirects.json').then((m) => {
      const path = location.pathname;
      const cand = m.default.find((r: any) => r.from === path);
      setBest(cand?.to || null);
    });
  }, []);
  return best ? (
    <p>
      Were you looking for <a href={best}>{best}</a>?
    </p>
  ) : null;
}
```

**Usage**: include on the 404 page.

## C3) Orphaned redirects check

**`scripts/migrate/check-orphans.js`**

```js
const fs = require('fs');
const map = JSON.parse(fs.readFileSync('docs/ops/meta/redirects.json', 'utf8'));
let fail = 0;
for (const r of map) {
  const target = `docs${r.to.endsWith('.md') ? '' : r.to}.md`;
  if (!fs.existsSync(target) && !fs.existsSync(target + '.mdx')) {
    console.error('Redirect target missing:', r.to);
    fail = 1;
  }
}
process.exit(fail);
```

---

# Track D — PR Scorecards (Perf + Doc Quality)

## D1) Compute deltas

**`scripts/perf/pr-scorecard.js`**

```js
const fs = require('fs');
function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}
const prev = readJSON('baseline/lhci.json') || {}; // store from default branch nightly
const cur = readJSON('.lighthouseci/manifest.json') || {}; // from PR run
const out = {
  perfDelta:
    (cur?.summary?.performance || 0) - (prev?.summary?.performance || 0),
};
fs.writeFileSync('pr-scorecard.json', JSON.stringify(out, null, 2));
```

## D2) PR comment

**`.github/workflows/docs-pr-scorecard.yml`**

```yaml
name: Docs PR Scorecard
on: [pull_request]
jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo '{}' > .lighthouseci/manifest.json || true
      - run: node scripts/perf/pr-scorecard.js
      - uses: actions/github-script@v7
        with:
          script: |
            const fs=require('fs'); const j=JSON.parse(fs.readFileSync('pr-scorecard.json','utf8'));
            const body = `**Docs Scorecard**\n- Performance delta: ${j.perfDelta}\n- Remember to include See also/Next steps.`;
            await github.rest.issues.createComment({ ...context.repo, issue_number: context.payload.pull_request.number, body })
```

---

# Track E — Subresource Integrity (SRI) & CSP Nonces

## E1) SRI for critical assets

**`scripts/security/add-sri.js`**

```js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function sha384(p) {
  return (
    'sha384-' +
    crypto.createHash('sha384').update(fs.readFileSync(p)).digest('base64')
  );
}
const dir = 'docs-site/build';
const index = path.join(dir, 'index.html');
let html = fs.readFileSync(index, 'utf8');
html = html.replace(/<script src="(\/assets\/[^\"]+)">/g, (m, src) =>
  m.replace(
    '>',
    ` integrity="${sha384(path.join(dir, src))}" crossorigin="anonymous">`,
  ),
);
fs.writeFileSync(index, html);
```

## E2) CSP nonces (preview)

Document approach: add nonce to inline scripts in the static host config; ensure Workbox SW updated accordingly.

---

# Execution Plan (3–5 days)

1. Enable **Lighthouse CI** on PRs and set budgets; wire minimal **RUM** emitter.
2. Turn on **image optimization** and **payload budgets**; subset fonts; validate cache headers.
3. Land **redirect map** + generator + 404 suggestions; add orphan check in CI.
4. Add **PR scorecard** comment job; seed baseline.
5. (Optional) Add **SRI** hashing step and document CSP nonces.

---

# Acceptance Criteria

- PRs run Lighthouse CI and fail on CWV regressions beyond budgets.
- Images are output in WebP with responsive variants; CSS/JS assets respect size budgets.
- 404 page suggests the correct redirect; orphaned redirects fail CI.
- Every docs PR includes a scorecard comment with perf delta.
- Index HTML includes SRI attributes for critical assets (or plan documented).
