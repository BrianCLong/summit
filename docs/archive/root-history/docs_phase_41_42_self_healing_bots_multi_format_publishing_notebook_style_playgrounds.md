---
title: Docs Phase 41–42: Self‑Healing Bots, Multi‑Format Publishing & Notebook‑Style Playgrounds
summary: Automate fixes with "self‑healing" bots, publish PDFs/EPUBs with print‑grade styling & watermarks, add Python (Pyodide) notebooks alongside JS/TS playgrounds, and enforce taxonomy with a quality score dashboard.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Self‑healing**: Auto‑fix common doc issues via bots (links, anchors, regions, formatting).
- **Multi‑format**: One repo → HTML, **PDF**, and **EPUB** with print CSS + watermarks.
- **Playgrounds**: Add **Python notebooks (Pyodide)** to complement JS/TS Sandpack.
- **Governance**: Controlled taxonomy + page **quality score** dashboard.

---

# Track A — Self‑Healing Bots (Auto‑Fixers)

## A1) Link Doctor — Auto‑rewrite & PR

**`docs/_meta/link-map.json`**

```json
{
  "/old/zip-export": "/how-to/zip-export",
  "https://old.example.com/api": "https://api.intelgraph.example"
}
```

**`scripts/bots/link-doctor.js`**

```js
const fs = require('fs');
const path = require('path');
const map = JSON.parse(fs.readFileSync('docs/_meta/link-map.json', 'utf8'));
let changes = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      let src = fs.readFileSync(p, 'utf8');
      let out = src;
      for (const [from, to] of Object.entries(map)) {
        const rx = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        out = out.replace(rx, to);
      }
      if (out !== src) {
        fs.writeFileSync(p, out);
        changes++;
      }
    }
  }
})('docs');
console.log('Link doctor changes:', changes);
```

**Workflow** `.github/workflows/bot-link-doctor.yml`

```yaml
name: Bot • Link Doctor
on:
  schedule: [{ cron: '0 7 * * 1' }]
  workflow_dispatch:
jobs:
  fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/bots/link-doctor.js
      - run: |
          git config user.name 'docs-bot'
          git config user.email 'docs-bot@users.noreply.github.com'
          git checkout -b chore/bot-link-fixes-$(date +%Y%m%d)
          git add -A && git commit -m 'chore(docs): auto‑fix links' || echo 'no changes'
          git push -u origin HEAD || true
```

## A2) Anchor Checker across versions

**`scripts/bots/anchor-check.js`**

```js
const fs = require('fs');
const path = require('path');
const rx = /\]\(([^)#]+)#([^\)]+)\)/g; // [text](/path#anchor)
const anchors = new Map(); // path -> Set(anchors)
// Load built anchor index if available
try {
  const idx = JSON.parse(fs.readFileSync('docs/ops/meta/anchors.json', 'utf8'));
  for (const [p, list] of Object.entries(idx)) anchors.set(p, new Set(list));
} catch {}
let missing = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && scan(p);
  }
})('docs');
function scan(p) {
  const md = fs.readFileSync(p, 'utf8');
  let m;
  while ((m = rx.exec(md))) {
    const to = m[1].replace(/\.mdx?$/, '');
    const a = m[2].toLowerCase();
    const set = anchors.get(to) || new Set();
    if (!set.has(a)) missing.push({ from: p, to, a });
  }
}
fs.mkdirSync('docs/ops/meta', { recursive: true });
fs.writeFileSync(
  'docs/ops/meta/missing-anchors.json',
  JSON.stringify(missing, null, 2),
);
console.log('Missing anchors:', missing.length);
if (missing.length) process.exit(1);
```

## A3) Region Sync Auto‑PR on code change

**`.github/workflows/bot-sync-regions.yml`**

```yaml
name: Bot • Sync Code Regions
on:
  push:
    paths: ['packages/**', 'src/**']
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/docs/sync-regions.js
      - run: |
          git config user.name 'docs-bot'
          git config user.email 'docs-bot@users.noreply.github.com'
          git checkout -b chore/bot-sync-regions-$(date +%s)
          git add docs && git commit -m 'chore(docs): sync code regions' || echo 'no changes'
          git push -u origin HEAD || true
```

## A4) Prettier/Remark formatting (auto‑fix)

**`package.json`** (snippets)

```json
{
  "devDependencies": {
    "prettier": "^3",
    "remark-cli": "^11",
    "remark-preset-lint-recommended": "^6"
  },
  "scripts": {
    "docs:fmt": "prettier -w \"docs/**/*.{md,mdx}\" && remark docs --frail --quiet --output"
  }
}
```

---

# Track B — Notebook‑Style Python Playgrounds (Pyodide)

## B1) Loader & component

**`src/components/PyPlayground.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';

export default function PyPlayground({
  code,
  requirements = [],
}: {
  code: string;
  requirements?: string[];
}) {
  const [ready, setReady] = useState(false);
  const [out, setOut] = useState('');
  const py = useRef<any>(null);
  useEffect(() => {
    (async () => {
      // Load Pyodide
      // @ts-ignore
      const { loadPyodide } = await import(
        'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.mjs'
      );
      py.current = await loadPyodide({
        stdout: (t: string) => setOut((o) => o + t + '\n'),
      });
      for (const r of requirements) {
        await py.current.runPythonAsync(
          `import micropip; await micropip.install('${r}')`,
        );
      }
      setReady(true);
    })();
  }, []);
  const run = async () => {
    setOut('');
    try {
      await py.current.runPythonAsync(code);
    } catch (e: any) {
      setOut(String(e));
    }
  };
  return (
    <div className="card padding--md">
      <button
        disabled={!ready}
        className="button button--primary"
        onClick={run}
      >
        {ready ? 'Run Python' : 'Loading…'}
      </button>
      <pre aria-live="polite">
        <code>{out || '\n'}</code>
      </pre>
    </div>
  );
}
```

**Usage in MDX**

```mdx
import PyPlayground from '@site/src/components/PyPlayground';

<PyPlayground code={`\nprint('hello from Pyodide')\n`} requirements={[]} />
```

**A11y & Safety**

- Client‑side only; no network calls in code examples.
- Consider CSP allowing the Pyodide origin in `script-src`.

---

# Track C — Multi‑Format Publishing (PDF & EPUB)

## C1) Print CSS + watermark support

**`docs-site/src/css/print.css`**

```css
@media print {
  nav,
  .theme-doc-toc-desktop,
  .navbar,
  .footer {
    display: none !important;
  }
  main {
    font-size: 11pt;
  }
  .watermark::before {
    content: attr(data-watermark);
    position: fixed;
    top: 40%;
    left: 10%;
    font-size: 48pt;
    color: rgba(0, 0, 0, 0.06);
    transform: rotate(-30deg);
  }
}
```

## C2) Puppeteer print‑to‑PDF

**`scripts/publish/print-pdf.js`**

```js
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
(async () => {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const pages = ['/', '/how-to/zip-export', '/releases/v24'];
  const outDir = 'docs/ops/exports/pdf';
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle0' });
    await page.addStyleTag({ path: 'docs-site/src/css/print.css' });
    await page.pdf({
      path: `${outDir}${p.replace(/\/$/, '') || '/home'}.pdf`,
      format: 'A4',
      printBackground: true,
    });
  }
  await browser.close();
})();
```

**Workflow** `.github/workflows/docs-pdf.yml`

```yaml
name: Docs PDF Export
on: [workflow_dispatch]
jobs:
  pdf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd docs-site && npm i && npm run build && npx serve -s build -l 3000 &
      - run: npm i puppeteer@22
      - run: node scripts/publish/print-pdf.js
      - uses: actions/upload-artifact@v4
        with: { name: docs-pdf, path: docs/ops/exports/pdf }
```

## C3) EPUB (Pandoc‑based, optional)

**`scripts/publish/epub.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
# Requires: pandoc installed in runner
mkdir -p docs/ops/exports/epub
find docs -name '*.md*' | sort | xargs pandoc -o docs/ops/exports/epub/intelgraph-docs.epub --metadata title='IntelGraph Docs' --toc --css=docs-site/src/css/print.css || echo 'pandoc not present; skipping'
```

**Workflow step** (optional):

```yaml
- run: bash scripts/publish/epub.sh
```

**Acceptance**

- PDF artifacts for selected pages; EPUB built when pandoc is available; internal watermark supported.

---

# Track D — Taxonomy & Synonyms Governance

## D1) Controlled taxonomy

**`docs/_meta/taxonomy.yml`**

```yaml
facets:
  role: [user, admin, operator]
  area: [api, ingestion, security, ops]
  edition: [community, enterprise]
```

## D2) Linter: enforce allowed tags

**`scripts/docs/check-taxonomy.js`**

```js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const tax = yaml.load(fs.readFileSync('docs/_meta/taxonomy.yml', 'utf8'));
const allowed = new Set(Object.values(tax.facets).flat());
let fail = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && check(p);
  }
})('docs');
function check(p) {
  const src = fs.readFileSync(p, 'utf8');
  const m = src.match(/\ntags:\s*\[(.*?)\]/);
  if (!m) return;
  const tags = m[1]
    .split(',')
    .map((x) => x.trim().replace(/^area:|^role:|^edition:/, ''));
  for (const t of tags) {
    if (t && !allowed.has(t)) {
      console.error('Unknown tag', t, 'in', p);
      fail = 1;
    }
  }
}
process.exit(fail);
```

## D3) Synonyms export (Algolia/Typesense)

**`scripts/docs/export-synonyms.js`**

```js
const fs = require('fs');
const syn = JSON.parse(
  fs.readFileSync('docs-site/algolia.synonyms.json', 'utf8'),
);
fs.mkdirSync('docs/ops/search', { recursive: true });
fs.writeFileSync(
  'docs/ops/search/typesense.synonyms.json',
  JSON.stringify(syn, null, 2),
);
```

**Acceptance**

- Tags conform to taxonomy; synonyms exported for both search backends.

---

# Track E — Page Quality Score & Dashboard

## E1) Score computation

**`scripts/docs/score-pages.js`**

````js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const staleCut = 90; // days
function daysAgo(d) {
  return Math.floor((Date.now() - new Date(d || 0).getTime()) / 86400000);
}
const rows = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && score(p);
  }
})('docs');
function score(p) {
  const g = matter.read(p);
  const body = g.content;
  const hasSee = /##\s*See also/i.test(body);
  const hasNext = /##\s*Next steps/i.test(body);
  const hasImgAlt = /!\[[^\]]+\]\(/.test(body);
  const hasCode = /```/.test(body);
  const stale = Math.max(
    0,
    Math.min(1, daysAgo(g.data.lastUpdated) / staleCut),
  );
  const base =
    50 +
    (hasSee ? 10 : 0) +
    (hasNext ? 10 : 0) +
    (hasImgAlt ? 10 : 0) +
    (hasCode ? 10 : 0) -
    Math.round(stale * 20);
  rows.push({
    path: p.replace(/^docs\//, ''),
    score: Math.max(0, Math.min(100, base)),
  });
}
fs.mkdirSync('docs/ops/quality', { recursive: true });
fs.writeFileSync('docs/ops/quality/scores.json', JSON.stringify(rows, null, 2));
````

## E2) Dashboard component

**`src/components/DocsQualityCard.tsx`**

```tsx
import React from 'react';
export default function DocsQualityCard(){
  const data = require('@site/docs/ops/quality/scores.json');
  if (!data?.length) return null;
  const low = data.filter((d:any)=> d.score < 70).slice(0,5);
  return (
    <div className="card padding--md">
      <strong>Docs Quality</strong>
      <p>{low.length} pages under target (<70). Top fixes:</p>
      <ul>
        {low.map((d:any)=> <li key={d.path}><a href={`/${d.path.replace(/\.mdx?$/,'')}`}>{d.path}</a> — {d.score}</li>)}
      </ul>
    </div>
  );
}
```

**Workflow** `.github/workflows/docs-quality-score.yml`

```yaml
name: Docs Quality Score
on:
  pull_request:
    paths: ['docs/**', 'scripts/docs/score-pages.js']
  schedule: [{ cron: '0 5 * * 1' }]
jobs:
  score:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/docs/score-pages.js
      - uses: actions/upload-artifact@v4
        with: { name: quality-scores, path: docs/ops/quality/scores.json }
```

---

# Execution Plan (4–5 days)

1. **A1–A3**: Land Link Doctor, Anchor Checker, and Region Sync auto‑PRs.
2. **B1**: Add PyPlayground and embed one Python example in a tutorial.
3. **C1–C2**: Print CSS + Puppeteer PDF export; watermark for internal.
4. **D1–D2**: Taxonomy linter; fail CI on unknown tags.
5. **E1–E2**: Generate scores.json and add dashboard card to the Docs Health page.

---

# Acceptance Criteria

- Link & anchor bots run on schedule and/or on PR; create actionable branches.
- Code regions auto‑sync when SDK changes; PRs open with diffs.
- A Python playground runs **client‑side**; at least one page uses it.
- PDF export artifact available; EPUB optional; internal watermark renders.
- Tags conform to controlled taxonomy; CI fails on unknown values.
- Quality dashboard shows sub‑70 pages; teams own follow‑up fixes.
