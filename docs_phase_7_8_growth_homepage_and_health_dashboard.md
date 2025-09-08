---
title: Docs Phase 7–8: Growth, Homepage, and Health Dashboard
summary: Ship a data-driven docs health dashboard, upgrade the homepage for tasks & search, and add self-healing tooling that keeps content fresh automatically.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives
- **See**: Track docs health over time (links, a11y, stale, coverage) on an in-site dashboard.
- **Guide**: Redesign the homepage around top tasks, roles, and search.
- **Self-heal**: Automate fixes for common failures (broken links, zero-result queries, API drift).

---

# Track A — Docs Health Dashboard (automated, in-site)

## A1) Nightly metrics commit → `docs/ops/health/data/`
**`.github/workflows/docs-health-commit.yml`**
```yaml
name: Docs Health Commit
on:
  schedule: [{ cron: '0 2 * * *' }]
  workflow_dispatch:
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate metrics (reuse existing jobs where possible)
        run: |
          # Assumes docs-stale-report.json exists or is generated here
          [ -f docs-stale-report.json ] || (npm i gray-matter@4 && node scripts/docs/stale-report.js)
          echo '{"brokenLinks":0,"a11y":0}' > tmp-metrics.json
      - name: Write dated metrics
        run: |
          mkdir -p docs/ops/health/data
          DATE=$(date -u +%F)
          jq -n --slurpfile s docs-stale-report.json --slurpfile m tmp-metrics.json '{
            date: env.DATE,
            staleCount: ($s[0]|length // 0),
            brokenLinks: ($m[0].brokenLinks // 0),
            a11y: ($m[0].a11y // 0)
          }' > docs/ops/health/data/$DATE.json
      - name: Update index
        run: node scripts/docs/health-index.js
      - name: Commit
        run: |
          git config user.name 'docs-bot'
          git config user.email 'docs-bot@users.noreply.github.com'
          git add docs/ops/health/data
          git commit -m 'chore(docs): update health metrics' || echo 'no changes'
          git push || true
```

**`scripts/docs/health-index.js`**
```js
const fs = require('fs');
const path = require('path');
const dir = 'docs/ops/health/data';
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort();
fs.writeFileSync(path.join(dir,'index.json'), JSON.stringify({ files }, null, 2));
```

## A2) Health dashboard component + page
**`src/components/DocsHealth.tsx`**
```tsx
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DocsHealth(){
  const [data, setData] = useState<any[]>([]);
  useEffect(()=>{
    async function load(){
      const idx = await import('@site/docs/ops/health/data/index.json');
      const rows: any[] = [];
      for (const f of idx.files){
        const rec = await import(`@site/docs/ops/health/data/${f}`);
        rows.push(rec);
      }
      setData(rows);
    }
    load();
  },[]);
  if (!data.length) return null;
  return (
    <div className="grid gap-8">
      <section>
        <h3>Stale Pages Over Time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ left: 16, right: 16, top: 16, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="staleCount" />
          </LineChart>
        </ResponsiveContainer>
      </section>
      <section className="grid md:grid-cols-2 gap-8">
        <div>
          <h3>Broken Links</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ left: 16, right: 16, top: 16, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="brokenLinks" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h3>A11y Violations</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ left: 16, right: 16, top: 16, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="a11y" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
```

**`docs/ops/health/index.mdx`**
```mdx
---
title: Docs Health Dashboard
summary: Rolling metrics for broken links, a11y, and stale pages.
owner: docs
---

import DocsHealth from '@site/src/components/DocsHealth';

<DocsHealth />
```

**Acceptance**: Nightly data committed; dashboard renders trend lines without local servers.

---

# Track B — Homepage Redesign (tasks, roles, search)

## B1) New homepage with role chips + top tasks + quick search
**`src/pages/index.tsx`**
```tsx
import React from 'react';
import Link from '@docusaurus/Link';

const roles = [
  { href: '/get-started/for-users', label: 'User' },
  { href: '/get-started/for-admins', label: 'Admin' },
  { href: '/get-started/for-operators', label: 'Operator' },
];

const tasks = [
  { href: '/tutorials/first-ingest', label: 'Ingest your first dataset' },
  { href: '/how-to/zip-export', label: 'ZIP Export & Certification' },
  { href: '/how-to/upgrade-to-v24', label: 'Upgrade to v24' },
  { href: '/reference', label: 'API & CLI Reference' },
];

export default function Home(){
  return (
    <main className="container margin-vert--lg">
      <section className="hero">
        <h1>IntelGraph Documentation</h1>
        <p className="hero__subtitle">Find answers fast—by role, task, or search.</p>
        <div className="flex gap-2 margin-top--sm">
          {roles.map(r => <Link key={r.href} className="button button--primary" to={r.href}>{r.label}</Link>)}
        </div>
        <div className="margin-top--md">
          <div className="docsearch-input" aria-label="Search docs" />
        </div>
      </section>
      <section className="margin-top--xl">
        <h2>Top tasks</h2>
        <ul>
          {tasks.map(t => <li key={t.href}><Link to={t.href}>{t.label}</Link></li>)}
        </ul>
      </section>
      <section className="margin-top--xl">
        <h2>What’s new</h2>
        <ul>
          <li><Link to="/releases/v24">Release Notes — v24</Link></li>
          <li><Link to="/reference/deprecations">Deprecations & Removals</Link></li>
        </ul>
      </section>
    </main>
  );
}
```

**Acceptance**: Homepage highlights roles, top tasks, and latest release; search box present (DocSearch attaches automatically).

---

# Track C — Self-healing: Links, Search, and API Drift

## C1) Link Doctor (auto-rewrite using a map)
**`docs/_meta/link-map.json`**
```json
{
  "https://old.example.com/foo": "https://new.example.com/foo",
  "http://bit.ly/old-short": "https://long.example.com/replacement"
}
```

**`scripts/docs/link-doctor.js`**
```js
const fs = require('fs');
const path = require('path');
const map = require('../../docs/_meta/link-map.json');

function replaceInFile(file){
  let src = fs.readFileSync(file,'utf8');
  let changed = false;
  for (const [from,to] of Object.entries(map)){
    const rx = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'g');
    if (rx.test(src)) { src = src.replace(rx, to); changed = true; }
  }
  if (changed) fs.writeFileSync(file, src);
}

function walk(dir){
  for (const f of fs.readdirSync(dir)){
    const p = path.join(dir,f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) replaceInFile(p);
  }
}
walk('docs');
```

**Add to** `docs-quality.yml` (as a fix step you can run manually or on schedule):
```yaml
      - name: Link doctor (rewrite known bad links)
        run: node scripts/docs/link-doctor.js
```

## C2) Zero-result search → backlog issues
**`scripts/docs/zero-results-to-issues.js`** (stub)
```js
// Pulls top zero-result queries from Algolia Analytics and opens issues.
console.log('Integrate Algolia Analytics here and write to docs/search-queries.md, then create issues with create-issue-from-file.');
```

**`.github/workflows/docs-zero-results.yml`**
```yaml
name: Docs Zero-Results Backlog
on:
  schedule: [{ cron: '0 11 * * 1' }]
  workflow_dispatch:
jobs:
  backlog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/docs/zero-results-to-issues.js
```

## C3) API drift → autogenerated notes
**`scripts/api/openapi-changes.md.js`**
```js
// Use openapi-diff to produce a human-readable markdown section appended to release notes.
console.log('Diff core spec vs previous tag and write to docs/releases/_fragments/api-diff.md');
```

---

# Track D — Content Quality Score & Badge

**`scripts/docs/quality-score.js`**
```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const files = [];
(function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); const s=fs.statSync(p); s.isDirectory()?walk(p):/\.mdx?$/.test(f)&&files.push(p);} })('docs');
const rows = [];
for (const f of files){
  const src = fs.readFileSync(f,'utf8');
  const fm = matter(src).data || {};
  const hasSeeAlso = /##\s*See also/i.test(src);
  const hasNext = /##\s*Next steps/i.test(src);
  const hasAlt = !/!\[[\s\]]*\]\(/.test(src); // naive alt text check
  const score = [hasSeeAlso, hasNext, hasAlt, !!fm.owner].filter(Boolean).length / 4;
  rows.push({ file: f.replace(/^docs\//,''), score });
}
fs.writeFileSync('docs/ops/quality-report.json', JSON.stringify(rows, null, 2));
```

**`src/components/QualityBadge.tsx`**
```tsx
import React from 'react';
export default function QualityBadge({ score }:{ score:number }){
  const pct = Math.round(score*100);
  const color = pct>=90?'success': pct>=75?'warning':'danger';
  return <span className={`badge badge--${color}`}>Quality {pct}%</span>;
}
```

**Usage** (optional, manual in top pages):
```mdx
import QualityBadge from '@site/src/components/QualityBadge';
<QualityBadge score={0.9} />
```

---

# Track E — i18n Readiness → Second Locale Stub

**`docusaurus.config.js`** additions
```js
i18n: {
  defaultLocale: 'en',
  locales: ['en','es'],
},
```

**Acceptance**: Site builds with `es` namespace scaffolded; glossary present.

---

# Execution plan (5–7 days)
1. Ship **Docs Health Dashboard** (A1–A2) and wire nightly metrics commit.
2. Replace homepage with **role chips + top tasks** (B1).
3. Add **Link Doctor** and start a small `link-map.json`.
4. Generate initial **quality-report.json** and add badges to top 10 pages.
5. Stub **zero-results** and **API drift** jobs; iterate once analytics keys are ready.

---

# Acceptance criteria
- Dashboard page live, with ≥3 daily data points after first week.
- New homepage deployed; bounce rate drops (track via analytics) and top tasks are one click away.
- Link Doctor rewrites at least 10 known-bad links repo-wide.
- Quality report generated; top pages s