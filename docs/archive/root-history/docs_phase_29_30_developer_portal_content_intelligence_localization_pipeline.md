---
title: Docs Phase 29–30: Developer Portal, Content Intelligence & Localization Pipeline
summary: Turn docs into a full developer portal with guided integrations, ML‑assisted content intelligence, and a translation export/import pipeline with quality gates.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Developer Portal**: Task-centric integrations hub with quickstarts, SDK pickers, and copy‑pasteable config generators.
- **Content Intelligence**: ML‑assisted tagging, topic clustering, and decay prediction to target updates.
- **Localization at Scale**: Export/import flows (XLIFF/JSON), translation QA checks, pseudo‑locale verification.
- **Governance**: Docs Handbook, RACI matrix, and contributor ladder for long‑term sustainability.

---

# Track A — Developer Portal (Integrations Hub)

## A1) Portal landing (+ SDK picker)

**`docs/portal/index.mdx`**

```mdx
---
title: Developer Portal
summary: Pick your SDK, get keys, and follow a 5‑minute guided setup.
owner: docs
---

import SdkPicker from '@site/src/components/SdkPicker';
import IntegrationsGrid from '@site/src/components/IntegrationsGrid';

<SdkPicker
  sdks={[
    { id: 'js', label: 'JavaScript' },
    { id: 'py', label: 'Python' },
  ]}
/>
<IntegrationsGrid
  items={[
    { slug: '/tutorials/first-ingest', label: 'Ingest' },
    { slug: '/how-to/zip-export', label: 'ZIP Export' },
  ]}
/>
```

**`src/components/SdkPicker.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
export default function SdkPicker({
  sdks,
}: {
  sdks: { id: string; label: string }[];
}) {
  const [sdk, setSdk] = useState(localStorage.getItem('sdk') || sdks[0].id);
  useEffect(() => {
    localStorage.setItem('sdk', sdk);
  }, [sdk]);
  return (
    <div className="card padding--md">
      <strong>SDK:</strong>
      {sdks.map((s) => (
        <button
          key={s.id}
          className={`button button--sm margin-left--sm ${sdk === s.id ? 'button--primary' : ''}`}
          onClick={() => setSdk(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
```

## A2) Config Generator (env + YAML)

**`src/components/ConfigGen.tsx`**

```tsx
import React, { useState } from 'react';
export default function ConfigGen() {
  const [apiKey, setApiKey] = useState('IG_API_KEY');
  const [endpoint, setEndpoint] = useState('https://api.intelgraph.example');
  const env = `INTELGRAPH_API_KEY=${apiKey}\nINTELGRAPH_ENDPOINT=${endpoint}`;
  const yaml = `intelgraph:\n  apiKey: ${apiKey}\n  endpoint: ${endpoint}\n`;
  return (
    <div className="card padding--md">
      <label>
        API Key
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
      </label>
      <label>
        Endpoint
        <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
      </label>
      <h4>.env</h4>
      <pre>
        <code>{env}</code>
      </pre>
      <h4>config.yaml</h4>
      <pre>
        <code>{yaml}</code>
      </pre>
    </div>
  );
}
```

## A3) Guided 5‑minute path per SDK

- Duplicate quickstart per SDK with tabs or SDK‑aware content using `localStorage.getItem('sdk')` in MDX.

**Acceptance**

- Portal page live; SDK selection persists; config generator copies cleanly.

---

# Track B — Content Intelligence (ML‑assisted)

## B1) Topic clustering & auto‑tags

**`scripts/docs/auto-tag.js`**

````js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { TfIdf } = require('natural');
const tfidf = new TfIdf();
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && files.push(p);
  }
})('docs');
files.forEach((f) =>
  tfidf.addDocument(fs.readFileSync(f, 'utf8').replace(/```[\s\S]*?```/g, '')),
);
const keywords = (i) =>
  tfidf
    .listTerms(i)
    .slice(0, 8)
    .map((t) => t.term);
files.forEach((f, i) => {
  const g = matter.read(f);
  g.data.tags = Array.from(new Set([...(g.data.tags || []), ...keywords(i)]));
  fs.writeFileSync(f, matter.stringify(g.content, g.data));
});
````

**CI** (manual run):

```yaml
name: Docs Auto‑Tag
on: [workflow_dispatch]
jobs:
  autotag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i natural gray-matter
      - run: node scripts/docs/auto-tag.js
      - run: git config user.name docs-bot && git config user.email docs-bot@users.noreply.github.com && git add -A && git commit -m "chore(docs): auto-tag" || echo "no changes"
```

## B2) Decay predictor (simple heuristic)

**`scripts/docs/decay-score.js`**

```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const now = Date.now();
const rows = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && rows.push(p);
  }
})('docs');
const out = rows.map((p) => {
  const g = matter.read(p);
  const days = Math.max(
    1,
    (now - new Date(g.data.lastUpdated || 0).getTime()) / (1000 * 60 * 60 * 24),
  );
  const score = Math.min(1, days / 180);
  return { path: p, days, score: Number(score.toFixed(2)) };
});
fs.writeFileSync(
  'docs/ops/decay-report.json',
  JSON.stringify(
    out.sort((a, b) => b.score - a.score),
    null,
    2,
  ),
);
```

**Acceptance**

- Auto‑tags added; decay report ranks pages needing refresh.

---

# Track C — Localization Pipeline (XLIFF/JSON)

## C1) Export translatable strings

**`scripts/i18n/export-xliff.js`**

````js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const strip = (s) => s.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '');
const entries = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && entries.push(p);
  }
})('docs');
let body = `<?xml version="1.0"?><xliff version="1.2"><file source-language="en" datatype="plaintext"><body>`;
entries.forEach((p) => {
  const g = matter.read(p);
  const id = p.replace(/^docs\//, '');
  body += `<trans-unit id="${id}"><source>${(g.content ? strip(g.content) : '').substring(0, 5000).replace(/&/g, '&amp;')}</source></trans-unit>`;
});
body += `</body></file></xliff>`;
fs.mkdirSync('i18n/export', { recursive: true });
fs.writeFileSync('i18n/export/docs-en.xliff', body);
````

## C2) Import translations

**`scripts/i18n/import-json.js`**

```js
const fs = require('fs');
const path = require('path');
const map = JSON.parse(fs.readFileSync('i18n/import/es.json', 'utf8')); // { slug: translatedContent }
for (const [slug, md] of Object.entries(map)) {
  const out = path.join('i18n/es', slug);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md);
}
```

## C3) Translation QA checks

- Vale glossary enforcement already exists; add length‑delta and placeholder checks.

**`scripts/i18n/qa.js`**

```js
const fs = require('fs');
const path = require('path');
const baseDir = 'docs';
const trDir = 'i18n/es';
let fail = 0;
function get(d) {
  return fs.existsSync(d) ? fs.readFileSync(d, 'utf8') : '';
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && check(p);
  }
})('docs');
function check(src) {
  const slug = src.replace(/^docs\//, '');
  const tr = path.join(trDir, slug);
  const a = get(src);
  const b = get(tr);
  if (!b) return;
  const lenDelta = Math.abs(b.length - a.length) / Math.max(1, a.length);
  if (lenDelta > 1.5) {
    console.error('Large length delta for', slug);
    fail = 1;
  }
}
process.exit(fail);
```

**CI** add steps to `docs-build` or `i18n` workflow.

**Acceptance**

- Export file produced; import script writes localized files; QA catches egregious issues.

---

# Track D — Docs Handbook, RACI & Contributor Ladder

## D1) Docs Handbook

**`docs/ops/handbook.md`** (skeleton)

```md
---
title: Docs Handbook
summary: How we plan, write, review, release, and measure docs.
owner: docs
---

- Process: Diátaxis, review gates, release cadence
- Style: tone, terminology, screenshots policy
- Metrics: SLOs, OKRs, dashboards
```

## D2) RACI matrix & ladder

**`docs/ops/raci.md`** and **`docs/ops/contributor-ladder.md`** with clear responsibilities and growth path.

---

# Execution Plan (4–5 days)

1. Ship **Developer Portal** (landing + SDK picker + config generator).
2. Run **auto‑tag** and land **decay report**; triage top 10 pages.
3. Land **i18n export/import** scripts + QA; produce first export.
4. Publish **Handbook**, **RACI**, and **Contributor Ladder** pages.

---

# Acceptance Criteria

- Developer Portal live and linked in top nav; SDK choice persists.
- Auto‑tag adds useful tags; decay report exists under `docs/ops/`.
- i18n export/import works locally; QA step integrated into CI.
- Handbook, RACI, and Ladder pages published and discoverable.
